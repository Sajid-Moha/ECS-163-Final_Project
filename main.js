/* stream graph */
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

/* main graph */
let topTenGenres = ["Action",
                    "Adventure",
                    "Comedy",
                    "Drama",
                    "Thriller",
                    "Science Fiction",
                    "Fantasy",
                    "Family",
                    "Romance",
                    "Animation"];
let topTenKeywords = ["sequel",
                      "duringcreditsstinger",
                      "based on novel or book",
                      "aftercreditsstinger",
                      "based on comic",
                      "superhero",
                      "new york city",
                      "california",
                      "magic",
                      "friendship"];

// {key: year, value: total revenue}
let totalRevenue = {};
let filterResults = false;

// find revenue that overlaps with valid genres and keywords
d3.csv('./datasets/TMDB_movie_dataset_reduced.csv').then(data => {
  totalRevenue = {};
  if (filterResults) {
    data.forEach(row => {
      const revenue = parseFloat(row.revenue);
      // make sure revenue value is valid
      if (isNaN(revenue) || revenue <= 0) return;

      // find key
      const releaseDate = new Date(row.release_date);
      const year = releaseDate.getFullYear();

      // filter years
      if (!year || year < 1914 || year > 2024) return;

      // split string of genres/keywords into arrays
      const genres = row.genres ? row.genres.split(/\s*,\s*/) : [];
      const keywords = row.keywords ? row.keywords.split(/\s*,\s*/) : [];

      // if there's any overlap between the filters and the current movie
      const genreFound = genres.some(genre => validGenres.includes(genre));
      const keywordFound = keywords.some(keyword => validKeywords.includes(keyword));

      // if overlap found, add to release year's total revenue
      if (genreFound || keywordFound) {
        if (!totalRevenue[year]) totalRevenue[year] = 0;
        totalRevenue[year] += revenue;
      }
    });
  } else {
    
  }

  console.log(totalRevenue);
});
