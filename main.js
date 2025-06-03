// main.js

const margin = { top: 40, right: 60, bottom: 30, left: 60 },
      width  = 1000 - margin.left - margin.right,
      height = 500  - margin.top  - margin.bottom;

// SVG container
const svg = d3.select("svg")
  .attr("width",  width  + margin.left + margin.right)
  .attr("height", height + margin.top  + margin.bottom)
.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

let revData, gdpAnnual, tmdbData;
let annualG, monthlyG;  // view containers

// Load all three CSVs
Promise.all([
  d3.csv("./chart_data/top_10_genres_revenue_by_year.csv", d3.autoType),
  d3.csv("./datasets/GDP.csv",                       d3.autoType),
  d3.csv("./datasets/TMDB_movie_dataset_reduced.csv", d3.autoType)
]).then(([rawRev, rawGdp, rawTmdb]) => {
  
  // annual revenue ≥1970
  revData = Array.from(
    d3.rollup(
      rawRev.filter(d => d.year >= 1970),
      v => d3.sum(v, d => d.total_revenue),
      d => d.year
    ),
    ([year, revenue]) => ({ year, revenue })
  ).sort((a,b)=>a.year-b.year);

  // annual GDP (quarterly avg) ≥1970
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
  ).sort((a,b)=>a.year-b.year);

  // TMDB parse release_date → year/month, keep revenue>0
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

  // show the annual view
  renderAnnual();
})
.catch(console.error);

////////////////////////////////////////////////////////////////////////////////
// renderAnnual: draw bars + GDP + legend, fade in
////////////////////////////////////////////////////////////////////////////////
function renderAnnual() {
  svg.on("click", null);
  if (monthlyG) monthlyG.transition().duration(300).attr("opacity", 0).remove();
  if (annualG)  annualG.remove();

  annualG = svg.append("g")
                .attr("opacity", 0);

  // scales
  const x    = d3.scaleBand()
                 .domain(revData.map(d=>d.year))
                 .range([0, width]).padding(0.1);
  const yRev = d3.scaleLinear()
                 .domain([0, d3.max(revData,d=>d.revenue)]).nice()
                 .range([height, 0]);
  const yGdp = d3.scaleLinear()
                 .domain([0, d3.max(gdpAnnual,d=>d.gdp)]).nice()
                 .range([height, 0]);

  // bars (Movie Revenue)
  annualG.selectAll(".bar")
    .data(revData)
    .join("rect")
      .attr("class","bar")
      .attr("x",     d=>x(d.year))
      .attr("y",     d=>yRev(d.revenue))
      .attr("width", x.bandwidth())
      .attr("height",d=>height - yRev(d.revenue))
      .attr("fill","darkorange")
      .style("cursor","pointer")
      .on("click", (ev,d) => { ev.stopPropagation(); renderMonthly(d.year); });

  // GDP line
  const lineGen = d3.line()
    .x(d=> x(d.year) + x.bandwidth()/2)
    .y(d=> yGdp(d.gdp))
    .curve(d3.curveMonotoneX);

  annualG.append("path")
     .datum(gdpAnnual.filter(d=>x.domain().includes(d.year)))
     .attr("fill","none")
     .attr("stroke","steelblue")
     .attr("stroke-width",2)
     .attr("d", lineGen);

  // axes
  annualG.append("g")
     .attr("transform", `translate(0,${height})`)
     .call(d3.axisBottom(x)
        .tickFormat(d3.format("d"))
        .tickValues(x.domain().filter((_,i)=>!(i%5)))
     );
annualG.append("g")
     .call(d3.axisLeft(yRev).ticks(6).tickFormat(d3.format(".2s")));

  // labels
  annualG.append("text")
     .attr("x", width/2).attr("y", height + margin.bottom - 5)
     .attr("text-anchor","middle").text("Year");
  annualG.append("text")
     .attr("x", -margin.left + 10).attr("y", -15)
     .attr("text-anchor","start").text("Total Revenue");


  // legend
  const legend = annualG.append("g")
      .attr("transform", `translate(${width - 50}, 0)`);
  // Movie Revenue
  legend.append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", 15).attr("height", 15)
      .attr("fill", "darkorange");
  legend.append("text")
      .attr("x", 20).attr("y", 12)
      .attr("font-size","12px")
      .attr("alignment-baseline","middle")
      .text("Movie Revenue");
  // GDP
  legend.append("line")
      .attr("x1", 0).attr("y1", 30)
      .attr("x2", 15).attr("y2", 30)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2);
  legend.append("text")
      .attr("x", 20).attr("y", 30)
      .attr("font-size","12px")
      .attr("alignment-baseline","middle")
      .text("GDP");

  // fade it in
  annualG.transition().duration(500).attr("opacity", 1);
}


// renderMonthly: draw 12-month heatmap, fade in, click svg to zoom out

function renderMonthly(year) {
  svg.on("click", null);
  if (annualG) annualG.transition().duration(300).attr("opacity", 0).remove();
  if (monthlyG) monthlyG.remove();

  monthlyG = svg.append("g")
                .attr("opacity", 0);

  svg.on("click", renderAnnual);

  const raw = tmdbData.filter(d => d.year === year);
  const monthlyMap = d3.rollup(
    raw, v=>d3.sum(v, d=>d.revenue), d=>d.month
  );
  const monthArr = d3.range(1,13).map(m=>({
    month: m,
    revenue: monthlyMap.get(m) || 0
  }));

  const cols = 4, rows = 3,
        cellW = width  / cols,
        cellH = height / rows;

  const color = d3.scaleSequential(d3.interpolateOranges)
                  .domain([0, d3.max(monthArr, d=>d.revenue)]);

  monthlyG.selectAll(".cell")
    .data(monthArr)
    .join("rect")
      .attr("class","cell")
      .attr("x", (d,i) => (i%cols)*cellW)
      .attr("y", (d,i) => Math.floor(i/cols)*cellH)
      .attr("width",  cellW - 2)
      .attr("height", cellH - 2)
      .attr("fill",   d=>color(d.revenue))
      .style("cursor","default")
      .on("click", ev => ev.stopPropagation());

  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  monthlyG.selectAll(".cell-label")
    .data(monthArr)
    .join("text")
      .attr("x", (d,i) => (i%cols)*cellW + cellW/2)
      .attr("y", (d,i) => Math.floor(i/cols)*cellH + cellH/2)
      .attr("text-anchor","middle")
      .attr("alignment-baseline","middle")
      .style("fill", d=> d.revenue > (d3.max(monthArr, m=>m.revenue)/2) ? "#fff" : "#000")
      .text((d,i) => names[i]);

  monthlyG.append("text")
     .attr("x", width/2).attr("y", -margin.top/2)
     .attr("text-anchor","middle")
     .attr("font-size","16px")
     .text(`Monthly Revenue • ${year}`);

  monthlyG.transition().duration(500).attr("opacity", 1);
}

