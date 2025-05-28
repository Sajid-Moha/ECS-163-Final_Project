import pandas as pd

columns_to_keep = ['id', 'title', 'release_date', 'revenue', 'genres', 'keywords']
chunksize = 100000

with pd.read_csv('dataset_minimization\TMDB_movie_dataset_v11.csv', usecols=columns_to_keep, chunksize=chunksize) as reader:
    for i, chunk in enumerate(reader):
        mode = 'w' if i == 0 else 'a'
        header = i == 0
        chunk.to_csv('dataset_minimization\movie.csv', mode=mode, header=header, index=False)
