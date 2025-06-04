// -----------------------------
// 1) Set up SVG + dimensions
// -----------------------------
const margin = { top: 40, right: 60, bottom: 50, left: 60 },
      totalWidth  = 1000,
      totalHeight = 500,
      width  = totalWidth  - margin.left - margin.right,
      height = totalHeight - margin.top  - margin.bottom;

// Append a top‐level <g> to account for margins
const svg = d3.select("svg")
  .attr("width",  totalWidth)
  .attr("height", totalHeight)
.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip <div>
const tooltip = d3.select(".tooltip");

let revData, gdpAnnual, tmdbData;
let annualG, monthlyG;  // containers for annual vs. monthly views

// Load the CSVs: 1) Movie revenue by year, 2) GDP, 3) TMDB (for monthly)
Promise.all([
  d3.csv("./chart_data/top_10_genres_revenue_by_year.csv", d3.autoType),
  d3.csv("./datasets/GDP.csv",                        d3.autoType),
  d3.csv("./datasets/TMDB_movie_dataset_reduced.csv", d3.autoType)
]).then(([rawRev, rawGdp, rawTmdb]) => {

  // --------------------------------
  // 2a) Prepare annual movie‐revenue ≥ 1970
  // --------------------------------
  revData = Array.from(
    d3.rollup(
      rawRev.filter(d => d.year >= 1970),
      v => d3.sum(v, d => d.total_revenue),
      d => d.year
    ),
    ([year, revenue]) => ({ year, revenue })
  ).sort((a,b) => a.year - b.year);

  // --------------------------------
  // 2b) Prepare annual GDP (average of each year) ≥ 1970
  // --------------------------------
  const gdpProcessed = rawGdp.map(d => {
    const dt = d.date instanceof Date ? d.date : new Date(d.date);
    return { year: dt.getFullYear(), gdp: +d.value };
  });
  gdpAnnual = Array.from(
    d3.rollup(
      gdpProcessed.filter(d => d.year >= 1970),
      v => d3.mean(v, d => d.gdp),
      d => d.year
    ),
    ([year, gdp]) => ({ year, gdp })
  ).sort((a,b) => a.year - b.year);

  // --------------------------------
  // 2c) Prepare TMDB monthly data (for drill‐down)
  // --------------------------------
  tmdbData = rawTmdb.map(d => {
    const dt = d.release_date instanceof Date
               ? d.release_date
               : new Date(d.release_date);
    return {
      year:    dt.getFullYear(),
      month:   dt.getMonth() + 1,
      revenue: +d.revenue
    };
  }).filter(d => d.year >= 1970 && d.revenue > 0);

  // Finally, draw the overlaid annual chart
  drawAnnual();

}).catch(console.error);


// -----------------------------
// 3) Draw Annual View (Bars + GDP Line)
// -----------------------------
function drawAnnual() {
  // Remove any existing contents (monthly or previous annual)
  svg.selectAll("*").remove();
  svg.on("click", null);

  // Append a <g> for the annual plot
  annualG = svg.append("g");

  // Shared X domain = all years ≥1970 that appear in revData
  const years = revData.map(d => d.year);
  const xScale = d3.scaleBand()
                   .domain(years)
                   .range([0, width])
                   .padding(0.1);

  // Y‐scale for revenue (bars): from 0 → maxRevenue → [height, 0]
  const yRev = d3.scaleLinear()
                 .domain([0, d3.max(revData, d => d.revenue)]).nice()
                 .range([height, 0]);

  // Y‐scale for GDP (line): from 0 → maxGDP → [height, 0]
  const yGdp = d3.scaleLinear()
                 .domain([0, d3.max(gdpAnnual, d => d.gdp)]).nice()
                 .range([height, 0]);

  // -----------------------------
  // 3a) Draw Revenue Bars
  // -----------------------------
  annualG.selectAll(".bar")
    .data(revData)
    .join("rect")
      .attr("class", "bar")
      .attr("x",     d => xScale(d.year))
      .attr("y",     d => yRev(d.revenue))
      .attr("width", xScale.bandwidth())
      .attr("height", d => height - yRev(d.revenue))
      .attr("fill",  "darkorange")
      .style("cursor", "pointer")

      //  Hover: darken + tooltip
      .on("mouseover", (event, d) => {
        // Darken bar
        d3.select(event.currentTarget)
          .attr("fill", "orangered");

        // Show tooltip
        tooltip
          .style("opacity", 1)
          .html(
            `Year: ${d.year}<br/>
             Revenue: $${d3.format(",")(d.revenue)}`
          )
          .style("left",  (event.pageX + 10) + "px")
          .style("top",   (event.pageY - 28) + "px");
      })
      .on("mousemove", (event) => {
        // Move tooltip with mouse
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 28) + "px");
      })
      .on("mouseout", (event) => {
        // Restore bar color
        d3.select(event.currentTarget)
          .attr("fill", "darkorange");

        // Hide tooltip
        tooltip.style("opacity", 0);
      })

      // Click: drill down to monthly view
      .on("click", (event, d) => {
        event.stopPropagation();
        drawMonthly(d.year);
      });

  // -----------------------------
  // 3b) Draw GDP Line
  // -----------------------------
  // Use a line generator that x = center of each band, y = yGdp(d.gdp)
  const lineGen = d3.line()
    .x(d => xScale(d.year) + xScale.bandwidth() / 2)
    .y(d => yGdp(d.gdp))
    .curve(d3.curveMonotoneX);

  annualG.append("path")
     .datum(gdpAnnual.filter(d => years.includes(d.year)))
     .attr("fill", "none")
     .attr("stroke", "steelblue")
     .attr("stroke-width", 2)
     .attr("d", lineGen);

  // -----------------------------
  // 3c) Axes
  // -----------------------------
  // Left Y‐axis (Revenue)
  annualG.append("g")
      .call(d3.axisLeft(yRev)
        .ticks(6)
        .tickFormat(d3.format(".2s"))
      );



  // X‐axis (Years) at the bottom
  annualG.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.format("d"))
        .tickValues(years.filter((_,i) => !(i % 5)))
      );

  // -----------------------------
  // 3d) Axis Labels
  // -----------------------------
  // X label
  annualG.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .text("Year");

  // Y label (left side)
  annualG.append("text")
      .attr("x", -margin.left + 10)
      .attr("y", -15)
      .attr("text-anchor", "start")
      .text("Total Movie Revenue");

  // Y label (right side)
  

  // -----------------------------
  // 3e) Legend (optional)
  // -----------------------------
  const legend = annualG.append("g")
                        .attr("transform", `translate(${width - 200}, -30)`);

  // Movie Revenue legend swatch
  legend.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", 15).attr("height", 15)
      .attr("fill", "darkorange");
  legend.append("text")
      .attr("x", 20).attr("y", 12)
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle")
      .text("Movie Revenue");

  // GDP legend swatch (line)
  legend.append("line")
      .attr("x1", 0).attr("y1", 30)
      .attr("x2", 15).attr("y2", 30)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2);
  legend.append("text")
      .attr("x", 20).attr("y", 30)
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle")
      .text("GDP");
}


// -----------------------------
// 4) Draw Monthly (4×3 Heatmap) for a given year
// -----------------------------
function drawMonthly(year) {
  // Clear the annual view
  svg.selectAll("*").remove();

  // Append a single <g> for the monthly grid
  monthlyG = svg.append("g");

  // Clicking anywhere returns to the annual view
  svg.on("click", () => {
    svg.on("click", null);
    drawAnnual();
  });

  // Filter TMDB data for this year
  const raw = tmdbData.filter(d => d.year === year);
  const monthlyMap = d3.rollup(
    raw,
    v => d3.sum(v, d => d.revenue),
    d => d.month
  );
  const monthArr = d3.range(1, 13).map(m => ({
    month:   m,
    revenue: monthlyMap.get(m) || 0
  }));

  // 4 columns × 3 rows arrangement
  const cols = 4, rows = 3,
        cellW = width / cols,
        cellH = height / rows;

  // Color scale for monthly revenue
  const color = d3.scaleSequential(d3.interpolateOranges)
                  .domain([0, d3.max(monthArr, d => d.revenue)]);

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Draw each cell
  monthlyG.selectAll(".cell")
    .data(monthArr)
    .join("rect")
      .attr("class", "cell")
      .attr("x",     (d,i) => (i % cols) * cellW)
      .attr("y",     (d,i) => Math.floor(i / cols) * cellH)
      .attr("width",  cellW - 2)
      .attr("height", cellH - 2)
      .attr("fill",   d => color(d.revenue))
      .style("cursor", "pointer")

      // Hover: darken + tooltip
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .attr("fill", d3.color(color(d.revenue)).darker());

        tooltip
          .style("opacity", 1)
          .html(
            `Month: ${monthNames[d.month - 1]}<br/>
             Revenue: $${d3.format(",")(d.revenue)}`
          )
          .style("left",  (event.pageX + 10) + "px")
          .style("top",   (event.pageY - 28) + "px");
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 10) + "px")
          .style("top",  (event.pageY - 28) + "px");
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .attr("fill", color(d.revenue));
        tooltip.style("opacity", 0);
      })
      // Prevent returning to annual view when clicking the cell
      .on("click", ev => ev.stopPropagation());

  // Label each cell with month abbreviation
  monthlyG.selectAll(".cell-label")
    .data(monthArr)
    .join("text")
      .attr("x", (d,i) => (i % cols) * cellW + cellW / 2)
      .attr("y", (d,i) => Math.floor(i / cols) * cellH + cellH / 2)
      .attr("text-anchor", "middle")
      .attr("alignment-baseline", "middle")
      .style("fill", d => d.revenue > (d3.max(monthArr, m => m.revenue) / 2) ? "#fff" : "#000")
      .text((d,i) => monthNames[i]);

  // Title at top
  monthlyG.append("text")
     .attr("x", width / 2)
     .attr("y", -margin.top / 2)
     .attr("text-anchor", "middle")
     .attr("font-size", "16px")
     .text(`Monthly Revenue • ${year}`);

  monthlyG.transition().duration(500).attr("opacity", 1);
}
