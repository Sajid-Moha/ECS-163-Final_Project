# ECS-163-Final_Project

Description - Describe the repository
- This repository holds all the files and folders used for our project. There is the chart_data folder that holds the aggregated .csv datasets used by our visualizations. The custom-components folder holds .js and .css files which add interactivity and controls the appearance of the slideshow and visualizations. This folder also contains the code for the main advanced visualization. The data_aggregation_scripts folder holds .py files that aggregate and cleanup our datasets held in its own folder. There is an images folder that contains the images used in the interactive slideshow. Then there is the index.html where the of structure of the webpage is using HTML and where the interactive slideshow can be opened. There is also main.js where the code for the supporting visualizations are located. Finally, there is the styles.css file that controls the appearance of the slideshow. 

Installation - How to install and setup your code
- Click on the green “Code” button on the repository’s main page, select the “Local” tab, and select “SSH”. Then copy the listed URL to your clipboard. 

- Next, open a terminal and navigate to your home directory. Then type “git clone <paste URL>” which should download a copy of the repository to your computer


Execution - How to run a demo on your code

- To start the application, open index.html file, right click on the mouse and press "open with liver server". If you do not have this option, install the Live Server extension on your VSCode.

- This should open a local server where you can begin the interactive slideshow.

# Dataset Reduction
Our dataset originally had 23 columns and was 530 MB (556,689,157 bytes); this was far too large and could not be added to our github repo. We created a short python script (datasets/shrink.py") to extract the 5 columns we needed; this reduced the filesize to 71.8 MB (75,329,497 bytes).
