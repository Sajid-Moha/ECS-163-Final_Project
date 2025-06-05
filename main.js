// -----------------------------
// Performance optimizations and caching utilities
// -----------------------------
class Main_DataCache {
  constructor() {
    this.cache = new Map();
    this.CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  }

  set(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_EXPIRY;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

const main_dataCache = new Main_DataCache();

// Non-blocking data processing utility
function main_processDataAsync(data, processor, chunkSize = 1000) {
  return new Promise((resolve) => {
    const result = [];
    let index = 0;

    function processChunk() {
      const end = Math.min(index + chunkSize, data.length);
      
      for (let i = index; i < end; i++) {
        const processed = processor(data[i]);
        if (processed) result.push(processed);
      }
      
      index = end;
      
      if (index < data.length) {
        // Use requestAnimationFrame to yield control back to browser
        requestAnimationFrame(processChunk);
      } else {
        resolve(result);
      }
    }
    
    processChunk();
  });
}

// Show loading indicator
function main_showLoadingIndicator() {
  const loadingDiv = d3.select("body").select(".loading-indicator");
  if (loadingDiv.empty()) {
    d3.select("body")
      .append("div")
      .attr("class", "loading-indicator")
      .style("position", "fixed")
      .style("top", "50%")
      .style("left", "50%")
      .style("transform", "translate(-50%, -50%)")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "20px")
      .style("border-radius", "5px")
      .style("z-index", "9999")
      .text("Loading data...");
  }
}

function main_hideLoadingIndicator() {
  d3.select(".loading-indicator").remove();
}

// -----------------------------
// Original setup code with main_ prefix
// -----------------------------
const main_margin = { top: 40, right: 60, bottom: 50, left: 60 },
      main_totalWidth  = 1000,
      main_totalHeight = 500,
      main_width  = main_totalWidth  - main_margin.left - main_margin.right,
      main_height = main_totalHeight - main_margin.top  - main_margin.bottom;

const main_svg = d3.select("svg")
  .attr("width",  main_totalWidth)
  .attr("height", main_totalHeight)
.append("g")
  .attr("transform", `translate(${main_margin.left},${main_margin.top})`);

let main_tooltip = d3.select(".tooltip");
if (main_tooltip.empty()) {
  main_tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("padding", "10px")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("opacity", 0);
}

let main_revData, main_gdpAnnual, main_tmdbData;
let main_annualG, main_monthlyG;

// Filter configuration
let main_topTenGenres = ["Action", "Adventure", "Comedy", "Drama", "Thriller", 
                    "Science Fiction", "Fantasy", "Family", "Romance", "Animation"];
let main_topTenKeywords = ["sequel", "duringcreditsstinger", "based on novel or book", 
                      "aftercreditsstinger", "based on comic", "superhero", 
                      "new york city", "california", "magic", "friendship"];
let main_validGenres = main_topTenGenres;
let main_validKeywords = main_topTenKeywords;
let main_filterResults = false;

// -----------------------------
// Optimized data loading and processing
// -----------------------------
async function main_loadAndProcessData() {
  main_showLoadingIndicator();
  
  try {
    // Check cache first
    const cacheKey = `data_${main_filterResults}_${main_validGenres.join(',')}_${main_validKeywords.join(',')}`;
    const cachedData = main_dataCache.get(cacheKey);
    
    if (cachedData) {
      console.log("Using cached data");
      ({ revData: main_revData, gdpAnnual: main_gdpAnnual, tmdbData: main_tmdbData } = cachedData);
      main_hideLoadingIndicator();
      main_drawAnnual();
      return;
    }

    // Load raw data
    const [rawGdp, rawTmdb] = await Promise.all([
      d3.csv("./chart_data/annual_average_gdp.csv", d3.autoType),
      d3.csv("./datasets/TMDB_movie_dataset_reduced.csv", d3.autoType)
    ]);

    console.log("GDP data loaded:", rawGdp.length, "rows");
    console.log("TMDB data loaded:", rawTmdb.length, "rows");

    if (rawTmdb.length === 0) {
      console.error("TMDB dataset is empty! Check file path: ./datasets/TMDB_movie_dataset_reduced.csv");
      main_hideLoadingIndicator();
      return;
    }

    // Process GDP data (fast, no need for async)
    main_gdpAnnual = rawGdp
      .filter(d => d.year >= 1970)
      .map(d => ({ year: d.year, gdp: d.average_gdp }))
      .sort((a,b) => a.year - b.year);

    // Process TMDB data asynchronously
    const totalRevenue = {};
    
    const tmdbProcessor = (row) => {
      const revenue = parseFloat(row.revenue);
      if (isNaN(revenue) || revenue <= 0) return null;
      
      const releaseDate = new Date(row.release_date);
      const year = releaseDate.getFullYear();
      if (!year || year < 1970 || year > 2024) return null;

      if (main_filterResults) {
        const genres = row.genres ? row.genres.split(/\s*,\s*/) : [];
        const keywords = row.keywords ? row.keywords.split(/\s*,\s*/) : [];
        const genreFound = genres.some(genre => main_validGenres.includes(genre));
        const keywordFound = keywords.some(keyword => main_validKeywords.includes(keyword));
        
        if (genreFound || keywordFound) {
          if (!totalRevenue[year]) totalRevenue[year] = 0;
          totalRevenue[year] += revenue;
        }
      } else {
        if (!totalRevenue[year]) totalRevenue[year] = 0;
        totalRevenue[year] += revenue;
      }

      // Return processed row for tmdbData
      return {
        year: year,
        month: releaseDate.getMonth() + 1,
        revenue: revenue
      };
    };

    // Process TMDB data in chunks to avoid blocking
    main_tmdbData = await main_processDataAsync(rawTmdb, tmdbProcessor);
    
    // Convert revenue totals to array format
    main_revData = Object.entries(totalRevenue)
      .map(([year, revenue]) => ({ year: +year, revenue }))
      .sort((a,b) => a.year - b.year);

    console.log("Processed revenue data:", main_revData.slice(0, 5));
    console.log("Processed TMDB data sample:", main_tmdbData.slice(0, 5));

    // Cache the processed data
    main_dataCache.set(cacheKey, { revData: main_revData, gdpAnnual: main_gdpAnnual, tmdbData: main_tmdbData });
    
    main_hideLoadingIndicator();
    main_drawAnnual();

    // Also store filtered movies with full details for heatmap
const filteredMovies = [];
const tmdbProcessorWithDetails = (row) => {
  const revenue = parseFloat(row.revenue);
  if (isNaN(revenue) || revenue <= 0) return null;
  
  const releaseDate = new Date(row.release_date);
  const year = releaseDate.getFullYear();
  if (!year || year < 1970 || year > 2024) return null;

  const genres = row.genres ? row.genres.split(/\s*,\s*/) : [];
  const keywords = row.keywords ? row.keywords.split(/\s*,\s*/) : [];

  if (main_filterResults) {
    const genreFound = genres.some(genre => main_validGenres.includes(genre));
    const keywordFound = keywords.some(keyword => main_validKeywords.includes(keyword));
    
    if (genreFound || keywordFound) {
      return {
        year: year,
        month: releaseDate.getMonth() + 1,
        revenue: revenue,
        genres: genres,
        keywords: keywords
      };
    }
    return null;
  } else {
    return {
      year: year,
      month: releaseDate.getMonth() + 1,
      revenue: revenue,
      genres: genres,
      keywords: keywords
    };
  }
};

main_tmdbData = await main_processDataAsync(rawTmdb, tmdbProcessorWithDetails);

  } catch (error) {
    console.error("Error loading data:", error);
    main_hideLoadingIndicator();
  }
}

// -----------------------------
// Optimized drawing functions with requestAnimationFrame
// -----------------------------
function main_drawAnnual() {
  // Use requestAnimationFrame to ensure smooth rendering
  requestAnimationFrame(() => {
    main_svg.selectAll("*").remove();
    main_svg.on("click", null);

    main_annualG = main_svg.append("g");

    const years = main_revData.map(d => d.year);
    const xScale = d3.scaleBand()
                     .domain(years)
                     .range([0, main_width])
                     .padding(0.1);

    const yRev = d3.scaleLinear()
                   .domain([0, d3.max(main_revData, d => d.revenue)]).nice()
                   .range([main_height, 0]);

    const yGdp = d3.scaleLinear()
                   .domain([0, d3.max(main_gdpAnnual, d => d.gdp)]).nice()
                   .range([main_height, 0]);

    // Draw revenue bars
    main_annualG.selectAll(".bar")
      .data(main_revData)
      .join("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yRev(d.revenue))
        .attr("width", xScale.bandwidth())
        .attr("height", d => main_height - yRev(d.revenue))
        .attr("fill", "darkorange")
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          d3.select(event.currentTarget).attr("fill", "orangered");
          main_tooltip
            .style("opacity", 1)
            .html(`Year: ${d.year}<br/>Revenue: $${d3.format(",")(d.revenue)}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
          main_tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (event) => {
          d3.select(event.currentTarget).attr("fill", "darkorange");
          main_tooltip.style("opacity", 0);
        })
        .on("click", (event, d) => {
          event.stopPropagation();
          main_drawMonthly(d.year);
        });

    // Draw GDP line
    const lineGen = d3.line()
      .x(d => xScale(d.year) + xScale.bandwidth() / 2)
      .y(d => yGdp(d.gdp))
      .curve(d3.curveMonotoneX);

    main_annualG.append("path")
       .datum(main_gdpAnnual.filter(d => years.includes(d.year)))
       .attr("fill", "none")
       .attr("stroke", "steelblue")
       .attr("stroke-width", 2)
       .attr("d", lineGen);

    // Add axes
    main_annualG.append("g")
        .call(d3.axisLeft(yRev)
          .ticks(6)
          .tickFormat(d3.format(".2s"))
        );

    main_annualG.append("g")
        .attr("transform", `translate(0,${main_height})`)
        .call(d3.axisBottom(xScale)
          .tickFormat(d3.format("d"))
          .tickValues(years.filter((_,i) => !(i % 5)))
        );

    main_annualG.append("g")
        .attr("transform", `translate(${main_width},0)`)
        .call(d3.axisRight(yGdp)
          .ticks(6)
          .tickFormat(d3.format(".2s"))
        );

    // Add labels
    main_annualG.append("text")
        .attr("x", main_width / 2)
        .attr("y", main_height + 40)
        .attr("text-anchor", "middle")
        .text("Year");

    main_annualG.append("text")
        .attr("x", -main_margin.left + 10)
        .attr("y", -15)
        .attr("text-anchor", "start")
        .text("Total Movie Revenue");

    main_annualG.append("text")
        .attr("x", main_width + main_margin.right - 10)
        .attr("y", -15)
        .attr("text-anchor", "end")
        .text("GDP");

    // Add legend
    const legend = main_annualG.append("g")
                          .attr("transform", `translate(${main_width - 240}, -30)`);

    legend.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", 15).attr("height", 15)
        .attr("fill", "darkorange");
    legend.append("text")
        .attr("x", 20).attr("y", 12)
        .attr("font-size", "12px")
        .attr("alignment-baseline", "middle")
        .text("Movie Revenue");

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

    legend.append("circle")
        .attr("cx", 7.5).attr("cy", 50)
        .attr("r", 6)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2);
    legend.append("text")
        .attr("x", 20).attr("y", 52)
        .attr("font-size", "12px")
        .attr("alignment-baseline", "middle")
        .attr("fill", "red")
        .text("Recession");

    // Highlight recession years
    const recessions = [1975, 1982, 1991, 2009, 2020];
    const recData = main_gdpAnnual.filter(d => 
      recessions.includes(d.year) && 
      years.includes(d.year) &&
      !isNaN(d.gdp)
    );

    main_annualG.selectAll(".recession-circle")
      .data(recData)
      .join("circle")
        .attr("class", "recession-circle")
        .attr("cx", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("cy", d => yGdp(d.gdp))
        .attr("r", 6)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2);
  });
}

function main_drawMonthly(year) {
  requestAnimationFrame(() => {
    main_svg.selectAll("*").remove();
    main_monthlyG = main_svg.append("g");

    main_svg.on("click", () => {
      main_svg.on("click", null);
      main_drawAnnual();
    });

    const raw = main_tmdbData.filter(d => d.year === year);
    const monthlyMap = d3.rollup(
      raw,
      v => d3.sum(v, d => d.revenue),
      d => d.month
    );
    const monthArr = d3.range(1, 13).map(m => ({
      month: m,
      revenue: monthlyMap.get(m) || 0
    }));

    const cols = 4, rows = 3,
          cellW = main_width / cols,
          cellH = main_height / rows;

    const color = d3.scaleSequential(d3.interpolateOranges)
                    .domain([0, d3.max(monthArr, d => d.revenue)]);

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    main_monthlyG.selectAll(".cell")
      .data(monthArr)
      .join("rect")
        .attr("class", "cell")
        .attr("x", (d,i) => (i % cols) * cellW)
        .attr("y", (d,i) => Math.floor(i / cols) * cellH)
        .attr("width", cellW - 2)
        .attr("height", cellH - 2)
        .attr("fill", d => color(d.revenue))
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          d3.select(event.currentTarget)
            .attr("fill", d3.color(color(d.revenue)).darker());
          main_tooltip
            .style("opacity", 1)
            .html(`Month: ${monthNames[d.month - 1]}<br/>Revenue: $${d3.format(",")(d.revenue)}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
          main_tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (event, d) => {
          d3.select(event.currentTarget).attr("fill", color(d.revenue));
          main_tooltip.style("opacity", 0);
        })
        .on("click", ev => ev.stopPropagation());

    main_monthlyG.selectAll(".cell-label")
      .data(monthArr)
      .join("text")
        .attr("x", (d,i) => (i % cols) * cellW + cellW / 2)
        .attr("y", (d,i) => Math.floor(i / cols) * cellH + cellH / 2)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "middle")
        .style("fill", d => d.revenue > (d3.max(monthArr, m => m.revenue) / 2) ? "#fff" : "#000")
        .text((d,i) => monthNames[i]);

    main_monthlyG.append("text")
       .attr("x", main_width / 2)
       .attr("y", -main_margin.top / 2)
       .attr("text-anchor", "middle")
       .attr("font-size", "16px")
       .text(`Monthly Revenue • ${year}`);

    main_monthlyG.append("rect")
       .attr("x", main_width - 80)
       .attr("y", -35)
       .attr("width", 70)
       .attr("height", 25)
       .attr("fill", "steelblue")
       .attr("rx", 3)
       .style("cursor", "pointer")
       .on("click", (event) => {
         event.stopPropagation();
         main_drawAnnual();
       });

    main_monthlyG.append("text")
       .attr("x", main_width - 45)
       .attr("y", -18)
       .attr("text-anchor", "middle")
       .attr("fill", "white")
       .attr("font-size", "12px")
       .style("cursor", "pointer")
       .text("← Back")
       .on("click", (event) => {
         event.stopPropagation();
         main_drawAnnual();
       });

    main_monthlyG.append("text")
       .attr("x", 10)
       .attr("y", main_height + 30)
       .attr("font-size", "12px")
       .attr("fill", "gray")
       .text("Click anywhere or use the Back button to return to annual view");

    main_monthlyG.transition().duration(500).attr("opacity", 1);
  });
}

// -----------------------------
// Public API for updating filters and clearing cache
// -----------------------------
function main_updateFilters(newGenres, newKeywords, enableFilter) {
  main_validGenres = newGenres || main_validGenres;
  main_validKeywords = newKeywords || main_validKeywords;
  main_filterResults = enableFilter !== undefined ? enableFilter : main_filterResults;
  
  // Clear cache when filters change
  main_dataCache.clear();
  
  // Reload and reprocess data
  main_loadAndProcessData();
}

function main_clearCache() {
  main_dataCache.clear();
  console.log("Data cache cleared");
}

// Initialize the visualization
main_loadAndProcessData();

// Initialize filter UI
function main_initializeFilters() {
  // Populate genre checkboxes
  const main_genreList = document.getElementById('genre-list');
  main_topTenGenres.forEach(genre => {
    const main_label = document.createElement('label');
    main_label.style.cssText = 'display: block; padding: 3px; cursor: pointer; font-size: 12px;';
    main_label.innerHTML = `
      <input type="checkbox" value="${genre}" class="genre-checkbox" style="margin-right: 5px;" checked>
      ${genre}
    `;
    main_genreList.appendChild(main_label);
  });
  
  // Populate keyword checkboxes
  const main_keywordList = document.getElementById('keyword-list');
  main_topTenKeywords.forEach(keyword => {
    const main_label = document.createElement('label');
    main_label.style.cssText = 'display: block; padding: 3px; cursor: pointer; font-size: 12px;';
    main_label.innerHTML = `
      <input type="checkbox" value="${keyword}" class="keyword-checkbox" style="margin-right: 5px;" checked>
      ${keyword}
    `;
    main_keywordList.appendChild(main_label);
  });
  
  // Toggle dropdowns
  document.getElementById('genre-toggle').addEventListener('click', () => {
    const main_dropdown = document.getElementById('genre-dropdown');
    main_dropdown.style.display = main_dropdown.style.display === 'none' ? 'block' : 'none';
  });
  
  document.getElementById('keyword-toggle').addEventListener('click', () => {
    const main_dropdown = document.getElementById('keyword-dropdown');
    main_dropdown.style.display = main_dropdown.style.display === 'none' ? 'block' : 'none';
  });
  
  // Select All functionality for genres
  document.getElementById('select-all-genres').addEventListener('change', (e) => {
    const main_checkboxes = document.querySelectorAll('.genre-checkbox');
    main_checkboxes.forEach(cb => cb.checked = e.target.checked);
  });
  
  // Select All functionality for keywords
  document.getElementById('select-all-keywords').addEventListener('change', (e) => {
    const main_checkboxes = document.querySelectorAll('.keyword-checkbox');
    main_checkboxes.forEach(cb => cb.checked = e.target.checked);
  });
  
  // Apply filters button
  document.getElementById('apply-filters').addEventListener('click', () => {
    const main_enableFilter = document.getElementById('enable-filter').checked;
    
    const main_selectedGenres = Array.from(document.querySelectorAll('.genre-checkbox:checked'))
      .map(cb => cb.value);
    
    const main_selectedKeywords = Array.from(document.querySelectorAll('.keyword-checkbox:checked'))
      .map(cb => cb.value);
    
    console.log('Applying filters:', {
      enabled: main_enableFilter,
      genres: main_selectedGenres,
      keywords: main_selectedKeywords
    });
    
    // Call the main update function
    main_updateFilters(main_selectedGenres, main_selectedKeywords, main_enableFilter);
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#filter-controls')) {
      document.getElementById('genre-dropdown').style.display = 'none';
      document.getElementById('keyword-dropdown').style.display = 'none';
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main_initializeFilters);
} else {
  main_initializeFilters();
}
