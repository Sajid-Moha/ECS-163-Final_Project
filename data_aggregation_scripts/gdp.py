# AI USAGE NOTICE: used AI to generate pandas snippets where I didn't know API

import pandas as pd

# Load the GDP dataset
gdp_df = pd.read_csv('./datasets/GDP.csv')

# Convert date column to datetime and extract year
gdp_df['date'] = pd.to_datetime(gdp_df['date'], errors='coerce')
gdp_df['year'] = gdp_df['date'].dt.year

# Group by year and calculate average GDP value
annual_gdp = (
    gdp_df.groupby('year')['value']
    .mean()
    .reset_index()
    .rename(columns={'value': 'average_gdp'})
)

# Save to CSV
annual_gdp.to_csv('./chart_data/annual_average_gdp.csv', index=False)
