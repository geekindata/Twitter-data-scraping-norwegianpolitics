**Schema (PostgreSQL v13)**
  
---
<p align=center><b>Digital Analysis</b>

---

**Query #1** How many users are there?

    SELECT COUNT(DISTINCT user_id) user_count
    FROM clique_bait.users;

| user_count |
| ---------- |
| 500        |

---
**Query #2** How many cookies does each user have on average?

    SELECT COUNT(cookie_id)/COUNT(DISTINCT(user_id)) as cookies_per_user
    FROM clique_bait.users;

| cookies_per_user |
| ---------------- |
| 3                |

---
**Query #3** What is the unique number of visits by all users per month?

    SELECT EXTRACT(MONTH FROM start_date), COUNT(DISTINCT cookie_id) as unique_visits
    FROM clique_bait.users
    GROUP BY 1
    ORDER BY 1;

| date_part | unique_visits |
| --------- | ------------- |
| 1         | 438           |
| 2         | 744           |
| 3         | 458           |
| 4         | 124           |
| 5         | 18            |

---
**Query #4** What is the number of events for each event type?

    SELECT event_type, COUNT(*) as num_of_events
    FROM clique_bait.events
    GROUP BY 1
    ORDER BY 1;

| event_type | num_of_events |
| ---------- | ------------- |
| 1          | 20928         |
| 2          | 8451          |
| 3          | 1777          |
| 4          | 876           |
| 5          | 702           |

---
**Query #5** What is the percentage of visits which have a purchase event?

    SELECT ROUND(100.0*COUNT(DISTINCT visit_id) / (SELECT COUNT(DISTINCT e.visit_id) FROM clique_bait.events e),2) as cisit_purchase_percentage
    FROM clique_bait.events
    WHERE event_type = 3;

| cisit_purchase_percentage |
| ------------------------- |
| 49.86                     |

---
**Query #7** What are the top 3 pages by number of views?

    SELECT page_id, COUNT(DISTINCT visit_id)
    FROM clique_bait.events
    WHERE event_type = 1
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 3;

| page_id | count |
| ------- | ----- |
| 2       | 3174  |
| 12      | 2103  |
| 1       | 1782  |

---
**Query #8** What is the number of views and cart adds for each product category?

    SELECT ph.product_category, 
    SUM(
      CASE
      	WHEN event_type = 1 THEN 1
      	ELSE 0
      END
     ) as total_views,
     SUM(
      CASE
      	WHEN event_type = 2 THEN 1
       	ELSE 0
      END
     ) as total_cart_adds
    FROM clique_bait.events ev
    JOIN clique_bait.page_hierarchy ph
    ON ev.page_id = ph.page_id
    GROUP BY ph.product_category;

| product_category | total_views | total_cart_adds |
| ---------------- | ----------- | --------------- |
|                  | 7059        | 0               |
| Luxury           | 3032        | 1870            |
| Shellfish        | 6204        | 3792            |
| Fish             | 4633        | 2789            |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/jmnwogTsUE8hGqkZv9H7E8/17)
