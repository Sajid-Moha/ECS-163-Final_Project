# AI USAGE NOTICE: used AI to generate pandas snippets where I didn't know API

import pandas as pd

# Load the dataset
movies_df = pd.read_csv('./datasets/TMDB_movie_dataset_reduced.csv')

# data cleanup -> remove rows with missing values + convert to correct data type
movies_df = movies_df.dropna(subset=['revenue', 'release_date', 'keywords'])
movies_df['revenue'] = pd.to_numeric(movies_df['revenue'], errors='coerce').fillna(0)
movies_df['release_year'] = pd.to_datetime(movies_df['release_date'], errors='coerce').dt.year
movies_df = movies_df[movies_df['revenue'] > 0]

# Explode keywords
movies_df['keywords'] = movies_df['keywords'].str.split(',\s*')
exploded_df = movies_df.explode('keywords')

# Group by year and keyword, sum revenue
year_keyword_revenue = (
    exploded_df.groupby(['release_year', 'keywords'])['revenue']
    .sum()
    .reset_index()
    .rename(columns={
        'release_year': 'year',
        'keywords': 'keyword',
        'revenue': 'total_revenue'
    })
)

# Remove rows where year > 2024
year_keyword_revenue = year_keyword_revenue[year_keyword_revenue['year'] <= 2024]

# Remove rows where total_revenue is 0
year_keyword_revenue = year_keyword_revenue[year_keyword_revenue['total_revenue'] > 0]

# Find top 10 keywords by revenue for each year
top_10_keywords_per_year = (
    year_keyword_revenue
    .sort_values(['year', 'total_revenue'], ascending=[True, False])
    .groupby('year')
    .head(10)
    .reset_index(drop=True)
)

# Save to CSV
top_10_keywords_per_year.to_csv('./chart_data/top_10_keywords_revenue_by_year.csv', index=False)
