const margin = { top: 20, right: 150, bottom: 30, left: 50 },
      width = 1000 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

const svg = d3.select("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

d3.csv("./chart_data/top_10_genres_revenue_by_year.csv", d3.autoType).then(data => {
    const allYears = Array.from(new Set(data.map(d => d.year))).sort((a, b) => a - b);
    const allGenres = Array.from(new Set(data.map(d => d.genre_name)));

    const dataByYear = allYears.map(year => {
        const row = { year };
        allGenres.forEach(g => row[g] = 0);
        data.filter(d => d.year === year).forEach(d => row[d.genre_name] = d.total_revenue);
        return row;
    });

    const stack = d3.stack()
        .keys(allGenres)
        .offset(d3.stackOffsetWiggle);

    const series = stack(dataByYear);

    const x = d3.scaleLinear()
        .domain(d3.extent(allYears))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series, s => d3.min(s, d => d[0])),
            d3.max(series, s => d3.max(s, d => d[1]))
        ])
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(allGenres)
        .range(d3.schemeCategory10);

    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    svg.selectAll("path")
        .data(series)
        .enter()
        .append("path")
        .attr("fill", d => color(d.key))
        .attr("d", area)
        .append("title")
        .text(d => d.key);

    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // --- Legend ---
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 10}, 0)`);

    allGenres.forEach((genre, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color(genre));

        row.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(genre)
            .attr("font-size", "12px")
            .attr("alignment-baseline", "middle");
    });
});
