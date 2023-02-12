**Schema (PostgreSQL v13)**

---
<p align=center><b>1. Data Cleansing Steps</b>

---

**Query #1** Convert the week_date to a DATE format. Add a week_number as the second column for each week_date value, for example any value from the 1st of January to 7th of January will be 1, 8th to 14th will be 2 etc. Add a month_number with the calendar month for each week_date value as the 3rd column. Add a calendar_year column as the 4th column containing either 2018, 2019 or 2020 values. Add a new column called age_band after the original segment column using the following mapping on the number inside the segment value

    DROP TABLE IF EXISTS data_mart.clean_weekly_sales;

    CREATE TABLE data_mart.clean_weekly_sales AS 
      SELECT TO_DATE(week_date, 'DD/MM/YY') as week_date,
      EXTRACT(WEEK FROM TO_DATE(week_date, 'DD/MM/YY')) as week_number,
      EXTRACT(MONTH FROM TO_DATE(week_date, 'DD/MM/YY')) as month_number,
      EXTRACT(YEAR FROM TO_DATE(week_date, 'DD/MM/YY')) as calendar_year,
      COALESCE(segment,'unknown') as segment,
      CASE
      	WHEN segment LIKE '%1%' THEN 'Young Adults'
        WHEN segment LIKE '%2%' THEN 'Middle Aged'
        WHEN segment LIKE '%3%' OR segment LIKE '%4%' THEN 'Retirees'
        ELSE 'unknown'
      END as age_band,
      CASE
      	WHEN segment LIKE '%C%' THEN 'Couples'
        WHEN segment LIKE '%F%' THEN 'Families'
        ELSE 'unknown'
      END as demographic,
      ROUND(sales * 1.0 / transactions, 2) as avg_transaction
      FROM data_mart.weekly_sales;

    SELECT * FROM data_mart.clean_weekly_sales ORDER BY week_date LIMIT 10;

| week_date                | week_number | month_number | calendar_year | segment | age_band     | demographic | avg_transaction |
| ------------------------ | ----------- | ------------ | ------------- | ------- | ------------ | ----------- | --------------- |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | null    | unknown      | unknown     | 169.98          |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | C2      | Middle Aged  | Couples     | 50.08           |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | F1      | Young Adults | Families    | 38.43           |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | C1      | Young Adults | Couples     | 143.38          |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | F1      | Young Adults | Families    | 54.41           |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | C4      | Retirees     | Couples     | 183.37          |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | F2      | Middle Aged  | Families    | 37.87           |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | C3      | Retirees     | Couples     | 60.68           |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | F1      | Young Adults | Families    | 44.19           |
| 2018-03-26T00:00:00.000Z | 13          | 3            | 2018          | C1      | Young Adults | Couples     | 127.35          |

---
<p align=center><b>2. Data Exploration</b>

---
  
**Query #1** What day of the week is used for each week_date value?

    SELECT DISTINCT TO_CHAR(week_date, 'Day') as day_of_week
    FROM data_mart.clean_weekly_sales;

| day_of_week |
| ----------- |
| Monday      |

---
**Query #2** What range of week numbers are missing from the dataset?

    SELECT DISTINCT week_number
    FROM data_mart.clean_weekly_sales
    ORDER BY week_number;

| week_number |
| ----------- |
| 13          |
| 14          |
| 15          |
| 16          |
| 17          |
| 18          |
| 19          |
| 20          |
| 21          |
| 22          |
| 23          |
| 24          |
| 25          |
| 26          |
| 27          |
| 28          |
| 29          |
| 30          |
| 31          |
| 32          |
| 33          |
| 34          |
| 35          |
| 36          |

---
**Query #3** How many total transactions were there for each year in the dataset?

    SELECT EXTRACT(YEAR FROM week_date) as year_, COUNT(*) 
    FROM data_mart.clean_weekly_sales
    GROUP BY year_
    ORDER BY year_;

| year_ | count |
| ----- | ----- |
| 2018  | 5698  |
| 2019  | 5708  |
| 2020  | 5711  |

---
**Query #4** What is the total sales for each region for each month?

    SELECT region, TO_CHAR(week_date, 'Month'), SUM(sales) as total_sales
    FROM data_mart.clean_weekly_sales
    GROUP BY region, month_number, TO_CHAR(week_date, 'Month')
    ORDER BY region, month_number;

| region        | to_char   | total_sales |
| ------------- | --------- | ----------- |
| AFRICA        | March     | 567767480   |
| AFRICA        | April     | 1911783504  |
| AFRICA        | May       | 1647244738  |
| AFRICA        | June      | 1767559760  |
| AFRICA        | July      | 1960219710  |
| AFRICA        | August    | 1809596890  |
| AFRICA        | September | 276320987   |
| ASIA          | March     | 529770793   |
| ASIA          | April     | 1804628707  |
| ASIA          | May       | 1526285399  |
| ASIA          | June      | 1619482889  |
| ASIA          | July      | 1768844756  |
| ASIA          | August    | 1663320609  |
| ASIA          | September | 252836807   |
| CANADA        | March     | 144634329   |
| CANADA        | April     | 484552594   |
| CANADA        | May       | 412378365   |
| CANADA        | June      | 443846698   |
| CANADA        | July      | 477134947   |
| CANADA        | August    | 447073019   |
| CANADA        | September | 69067959    |
| EUROPE        | March     | 35337093    |
| EUROPE        | April     | 127334255   |
| EUROPE        | May       | 109338389   |
| EUROPE        | June      | 122813826   |
| EUROPE        | July      | 136757466   |
| EUROPE        | August    | 122102995   |
| EUROPE        | September | 18877433    |
| OCEANIA       | March     | 783282888   |
| OCEANIA       | April     | 2599767620  |
| OCEANIA       | May       | 2215657304  |
| OCEANIA       | June      | 2371884744  |
| OCEANIA       | July      | 2563459400  |
| OCEANIA       | August    | 2432313652  |
| OCEANIA       | September | 372465518   |
| SOUTH AMERICA | March     | 71023109    |
| SOUTH AMERICA | April     | 238451531   |
| SOUTH AMERICA | May       | 201391809   |
| SOUTH AMERICA | June      | 218247455   |
| SOUTH AMERICA | July      | 235582776   |
| SOUTH AMERICA | August    | 221166052   |
| SOUTH AMERICA | September | 34175583    |
| USA           | March     | 225353043   |
| USA           | April     | 759786323   |
| USA           | May       | 655967121   |
| USA           | June      | 703878990   |
| USA           | July      | 760331754   |
| USA           | August    | 712002790   |
| USA           | September | 110532368   |

---
**Query #5** What is the total count of transactions for each platform

    SELECT platform, SUM(transactions) total_transactions
    FROM data_mart.weekly_sales
    GROUP BY platform
    ORDER BY total_transactions DESC;

| platform | total_transactions |
| -------- | ------------------ |
| Retail   | 1081934227         |
| Shopify  | 5925169            |

---
**Query #6** What is the percentage of sales for Retail vs Shopify for each month?

    SELECT cws1.month_number, cws1.platform, ROUND(SUM(cws1.sales) * 100.0 / (SELECT SUM(cws2.SALES) FROM data_mart.clean_weekly_sales cws2 WHERE cws2.month_number = cws1.month_number),1) as percentage
    FROM data_mart.clean_weekly_sales cws1
    GROUP BY cws1.month_number, cws1.platform
    ORDER BY cws1.month_number;

| month_number | platform | percentage |
| ------------ | -------- | ---------- |
| 3            | Retail   | 97.5       |
| 3            | Shopify  | 2.5        |
| 4            | Retail   | 97.6       |
| 4            | Shopify  | 2.4        |
| 5            | Retail   | 97.3       |
| 5            | Shopify  | 2.7        |
| 6            | Retail   | 97.3       |
| 6            | Shopify  | 2.7        |
| 7            | Retail   | 97.3       |
| 7            | Shopify  | 2.7        |
| 8            | Retail   | 97.1       |
| 8            | Shopify  | 2.9        |
| 9            | Retail   | 97.4       |
| 9            | Shopify  | 2.6        |

---
**Query #7** What is the percentage of sales by demographic for each year in the dataset?

    SELECT cws1.calendar_year, cws1.demographic, 
    ROUND((SUM(cws1.sales) * 100.0) / (SELECT SUM(cws2.sales) FROM data_mart.clean_weekly_sales cws2 WHERE cws2.calendar_year = cws1.calendar_year), 1) as percentage_sales
    FROM data_mart.clean_weekly_sales cws1
    GROUP BY cws1.calendar_year, cws1.demographic
    ORDER BY cws1.calendar_year, cws1.demographic;

| calendar_year | demographic | percentage_sales |
| ------------- | ----------- | ---------------- |
| 2018          | Couples     | 26.4             |
| 2018          | Families    | 32.0             |
| 2018          | unknown     | 41.6             |
| 2019          | Couples     | 27.3             |
| 2019          | Families    | 32.5             |
| 2019          | unknown     | 40.3             |
| 2020          | Couples     | 28.7             |
| 2020          | Families    | 32.7             |
| 2020          | unknown     | 38.6             |

---
**Query #8** Which age_band and demographic values contribute the most to Retail sales?

    SELECT age_band, demographic, SUM(sales) as total_sales
    FROM data_mart.clean_weekly_sales
    GROUP BY age_band, demographic
    ORDER BY total_sales DESC
    LIMIT 1;

| age_band | demographic | total_sales |
| -------- | ----------- | ----------- |
| unknown  | unknown     | 16338612234 |


---
<p align=center><b>3. Before & After Analysis</b>

---
**Query #1** What is the total sales for the 4 weeks before and after 2020-06-15? What is the growth or reduction rate in actual values and percentage of sales?

    WITH total_sales_cte AS (
    SELECT week_number, SUM(sales) as total_sales, LAG(SUM(sales)::INTEGER, 1) OVER(ORDER BY week_number) as prev_sales
    FROM data_mart.clean_weekly_sales
    WHERE week_number BETWEEN EXTRACT(WEEK FROM TO_DATE('2020-06-15', 'YYYY-MM-DD')) - 4 AND EXTRACT(WEEK FROM TO_DATE('2020-06-15', 'YYYY-MM-DD')) + 3
    GROUP BY week_number)
    
    SELECT week_number, ROUND((100.0*(total_sales - prev_sales)/prev_sales),2) as growth_rate
    FROM total_sales_cte;

| week_number | growth_rate |
| ----------- | ----------- |
| 21          |             |
| 22          | 1.77        |
| 23          | -1.55       |
| 24          | 0.67        |
| 25          | -1.74       |
| 26          | 0.66        |
| 27          | 0.17        |
| 28          | 2.90        |

---
**Query #2** What about the entire 12 weeks before and after?

    WITH total_sales_cte AS (
    SELECT week_number, SUM(sales) as total_sales, LAG(SUM(sales)::INTEGER, 1) OVER(ORDER BY week_number) as prev_sales
    FROM data_mart.clean_weekly_sales
    WHERE week_number BETWEEN EXTRACT(WEEK FROM TO_DATE('2020-06-15', 'YYYY-MM-DD')) - 12 AND EXTRACT(WEEK FROM TO_DATE('2020-06-15', 'YYYY-MM-DD')) + 11
    GROUP BY week_number)
    
    SELECT week_number, ROUND((100.0*(total_sales - prev_sales)/prev_sales),2) as growth_rate
    FROM total_sales_cte;

| week_number | growth_rate |
| ----------- | ----------- |
| 13          |             |
| 14          | -1.22       |
| 15          | -0.87       |
| 16          | -2.21       |
| 17          | 0.06        |
| 18          | 1.53        |
| 19          | 0.46        |
| 20          | -1.78       |
| 21          | -1.01       |
| 22          | 1.77        |
| 23          | -1.55       |
| 24          | 0.67        |
| 25          | -1.74       |
| 26          | 0.66        |
| 27          | 0.17        |
| 28          | 2.90        |
| 29          | -1.01       |
| 30          | 0.53        |
| 31          | -1.05       |
| 32          | 0.07        |
| 33          | 0.40        |
| 34          | 0.24        |
| 35          | 1.49        |
| 36          | -0.05       |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/jmnwogTsUE8hGqkZv9H7E8/8)
