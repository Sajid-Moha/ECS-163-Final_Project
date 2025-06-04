import pandas as pd

# Load the dataset
movies_df = pd.read_csv('./datasets/TMDB_movie_dataset_reduced.csv')

# data cleanup -> remove rows with missing values + convert to correct data type
movies_df = movies_df.dropna(subset=['revenue', 'release_date', 'genres'])
movies_df['revenue'] = pd.to_numeric(movies_df['revenue'], errors='coerce').fillna(0)
movies_df['release_year'] = pd.to_datetime(movies_df['release_date'], errors='coerce').dt.year

# explode dataset by genre to perform math easily
movies_df['genres'] = movies_df['genres'].str.split(',\s*')
exploded_df = movies_df.explode('genres')

# do math to find total revenue per genre
genre_revenue = (
    exploded_df.groupby('genres')['revenue']
    .sum()
    .sort_values(ascending=False)
)

# fetch top 10 genres for all time revenue
top_10_genres = genre_revenue.head(10).index.tolist()
top_genres_df = exploded_df[exploded_df['genres'].isin(top_10_genres)]

# Group by year and genre, calculate both sum and count of revenue
year_genre_stats = (
    top_genres_df.groupby(['release_year', 'genres'])['revenue']
    .agg(['sum', 'count'])
    .reset_index()
    .rename(columns={
        'release_year': 'year',
        'genres': 'genre_name',
        'sum': 'total_revenue',
        'count': 'movie_count'
    })
)

# Calculate average revenue and round to nearest dollar
year_genre_stats['avg_revenue'] = (year_genre_stats['total_revenue'] / year_genre_stats['movie_count']).round(0).astype(int)

# Sort by year and total revenue
year_genre_stats = year_genre_stats.sort_values(['year', 'total_revenue'], ascending=[True, False])

# filter out any rows with year > 2024
year_genre_stats = year_genre_stats[year_genre_stats['year'] <= 2024]

# filter out any rows with year < 1914 due to lots of data with 0-revenue data
year_genre_stats = year_genre_stats[year_genre_stats['year'] >= 1914]

# export
year_genre_stats.to_csv('./chart_data/top_10_genres_revenue_by_year.csv', index=False)
