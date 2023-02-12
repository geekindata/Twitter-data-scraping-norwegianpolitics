**Schema (PostgreSQL v13)**

---
<p align=center><b>Data Exploration and Cleansing</b>

---

**Query #1** Update the fresh_segments.interest_metrics table by modifying the month_year column to be a date data type with the start of the month

    ALTER TABLE fresh_segments.interest_metrics ALTER COLUMN month_year TYPE text;

    UPDATE fresh_segments.interest_metrics
    SET month_year = TO_DATE(month_year,'MM-YYYY');

---
**Query #2** What is count of records in the fresh_segments.interest_metrics for each month_year value sorted in chronological order (earliest to latest) with the null values appearing first?

    SELECT month_year, COUNT(*)
    FROM fresh_segments.interest_metrics
    GROUP BY month_year
    ORDER BY month_year
    NULLS FIRST;

| month_year | count |
| ---------- | ----- |
|            | 1194  |
| 2018-07-01 | 729   |
| 2018-08-01 | 767   |
| 2018-09-01 | 780   |
| 2018-10-01 | 857   |
| 2018-11-01 | 928   |
| 2018-12-01 | 995   |
| 2019-01-01 | 973   |
| 2019-02-01 | 1121  |
| 2019-03-01 | 1136  |
| 2019-04-01 | 1099  |
| 2019-05-01 | 857   |
| 2019-06-01 | 824   |
| 2019-07-01 | 864   |
| 2019-08-01 | 1149  |

---
**Query #4** How many interest_id values exist in the fresh_segments.interest_metrics table but not in the fresh_segments.interest_map table? What about the other way around?

    SELECT interest_id::INTEGER
    FROM fresh_segments.interest_metrics
    EXCEPT
    SELECT id
    FROM fresh_segments.interest_map;

| interest_id |
| ----------- |
|             |

    SELECT id
    FROM fresh_segments.interest_map
    EXCEPT
    SELECT interest_id::INTEGER
    FROM fresh_segments.interest_metrics;

| id    |
| ----- |
| 42400 |
| 47789 |
| 35964 |
| 40185 |
| 19598 |
| 40186 |
| 42010 |

---
**Query #5** Summarise the id values in the fresh_segments.interest_map by its total record count in this table

    SELECT ma.id, COUNT(*)
    FROM fresh_segments.interest_map ma
    LEFT JOIN fresh_segments.interest_metrics me
    ON ma.id = me.interest_id::INTEGER
    GROUP BY ma.id
    ORDER BY ma.id
    LIMIT 10;

| id  | count |
| --- | ----- |
| 1   | 12    |
| 2   | 11    |
| 3   | 10    |
| 4   | 14    |
| 5   | 14    |
| 6   | 14    |
| 7   | 11    |
| 8   | 13    |
| 12  | 14    |
| 13  | 13    |

---
<p align=center><b>Interest Analysis</b>

---

**Query #1** Which interests have been present in all month_year dates in our dataset?

    WITH cte AS
    (SELECT COUNT(DISTINCT month_year) as cnt FROM fresh_segments.interest_metrics)
    
    SELECT interest_id::INTEGER
    FROM fresh_segments.interest_metrics
    GROUP BY 1
    HAVING COUNT(DISTINCT month_year) = (SELECT cte.cnt FROM cte)
    LIMIT 10;

| interest_id |
| ----------- |
| 4           |
| 5           |
| 6           |
| 12          |
| 15          |
| 16          |
| 17          |
| 18          |
| 20          |
| 25          |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/iRdsT76vaus813crPP8Ma4/10)
