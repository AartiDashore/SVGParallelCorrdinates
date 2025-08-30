const filePath = "CSE_Enrollment.xlsx";
    const margin = { top: 50, right: 200, bottom: 50, left: 100 };
    const width = 1200 - margin.left - margin.right;
    const height = 700 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("fill", "black");

    const chartGroup = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    async function loadData() {
        const response = await fetch(filePath);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        const processedData = processData(json);
        createChart(processedData);
    }

        function processData(json) {
            const groupedData = d3.group(json, d => d.Department);
            const data = Array.from(groupedData, ([department, records]) => ({
                department,
                avgStudents: Math.round(d3.mean(records, d => +d.Student_Count)),
                coursesPerQuarter: records.length,
                studentsPerInstructor: Math.round(d3.sum(records, d => +d.Student_Count) / new Set(records.map(d => d.Faculty)).size)
            }));
            return data;
        }

        function createChart(data) {
            const dimensions = ["avgStudents", "coursesPerQuarter", "studentsPerInstructor"];

            const yScales = {};
            dimensions.forEach(dim => {
                yScales[dim] = d3.scaleLinear()
                    .domain([0, d3.max(data, d => d[dim]) + 15])
                    .range([height, 0]);
            });

            const xScale = d3.scalePoint()
                .domain(dimensions)
                .range([0, width]);

            const line = d3.line()
                .x(d => xScale(d.dimension))
                .y(d => yScales[d.dimension](d.value));

            const color = d3.scaleOrdinal(d3.schemeCategory10);

            chartGroup.selectAll(".dimension")
                .data(dimensions)
                .enter().append("g")
                .attr("class", "dimension")
                .attr("transform", d => `translate(${xScale(d)})`)
                .each(function(d) {
                    d3.select(this)
                    .call(d3.axisLeft(yScales[d])
                    .tickSize(6)
                    .tickFormat(tick => tick)
                    )
                .selectAll("text")
                .style("font-weight", "bold")
                .style("font-size", "12px")
                .style("fill", "white"); // Make scale values white
                
                 // Apply styling to the axis line
                d3.select(this).selectAll("path") // Axis path
                    .attr("stroke", "white")
                    .attr("stroke-width", 1.5);

                d3.select(this).selectAll("line") // Axis ticks
                    .attr("stroke", "white");
                })
                .append("text")
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .text(d => {
                    if (d === "avgStudents") return "Avg Students per Class";
                    if (d === "coursesPerQuarter") return "Courses per Quarter";
                    return "Students per Instructor";
                })
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("fill", "white");

            chartGroup.selectAll(".line")
                .data(data)
                .enter().append("path")
                .attr("class", "line")
                .attr("d", d => line(dimensions.map(dim => ({ dimension: dim, value: d[dim] }))))
                .attr("stroke", d => color(d.department))
                .attr("fill", "none")
                .attr("stroke-width", 4) // Thicker lines
                .on("mouseover", function(event, d) {
                    d3.select("#tooltip")
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY + 10}px`)
                        .style("display", "inline-block")
                        .style("background-color", "white")
                        .style("color", "black")
                        .style("opacity", "80%")
                        .style("font-weight", "bold")
                        .html(`Department: ${d.department}<br>
                            Avg Students: ${d.avgStudents}<br>
                            Courses/Quarter: ${d.coursesPerQuarter}<br>
                            Students/Instructor: ${d.studentsPerInstructor}`
                        );
                    d3.select(this)
                    .attr("stroke-width", 6); // Even thicker on hover
                })
                .on("mouseout", function() {
                    d3.select("#tooltip")
                    .style("display", "none");

                    d3.select(this)
                    .attr("stroke-width", 4); // Return to original thickness
                });

            const legend = svg.append("g")
                .attr("transform", `translate(${width + margin.left + 50}, ${margin.top})`)
                .selectAll("g")
                .data(data)
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(0, ${i * 25})`);

            legend.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 20)
                .attr("height", 20)
                .attr("fill", d => color(d.department));

            legend.append("text")
                .attr("x", 25)
                .attr("y", 15)
                .style("fill", "white")
                .text(d => d.department);
        }

        loadData();