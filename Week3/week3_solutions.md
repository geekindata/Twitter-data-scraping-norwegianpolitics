**Schema (PostgreSQL v13)**

---
<p align=center><b>B. Data Analysis Questions</b>

---
**Query #1** How many customers has Foodie-Fi ever had?
    
    SELECT COUNT(DISTINCT(customer_id)) as total_customers
    FROM foodie_fi.subscriptions;

| total_customers |
| --------------- |
| 1000            |

---
**Query #2** What is the monthly distribution of trial plan start_date values for our dataset - use the start of the month as the group by value
    
    SELECT EXTRACT(MONTH FROM start_date) as months, COUNT(*)
    FROM foodie_fi.subscriptions
    WHERE plan_id = 0
    GROUP BY EXTRACT(MONTH FROM start_date)
    ORDER BY EXTRACT(MONTH FROM start_date);

| months | count |
| ------ | ----- |
| 1      | 88    |
| 2      | 68    |
| 3      | 94    |
| 4      | 81    |
| 5      | 88    |
| 6      | 79    |
| 7      | 89    |
| 8      | 88    |
| 9      | 87    |
| 10     | 79    |
| 11     | 75    |
| 12     | 84    |

---
**Query #3** What plan start_date values occur after the year 2020 for our dataset? Show the breakdown by count of events for each plan_name
    
    SELECT pl.plan_name, COUNT(*)
    FROM foodie_fi.plans pl
    JOIN foodie_fi.subscriptions sub
    ON pl.plan_id = sub.plan_id
    WHERE EXTRACT(year from sub.start_date) > 2020
    GROUP BY pl.plan_name
    ORDER BY COUNT(*) DESC;

| plan_name     | count |
| ------------- | ----- |
| churn         | 71    |
| pro annual    | 63    |
| pro monthly   | 60    |
| basic monthly | 8     |

---
**Query #4** What is the customer count and percentage of customers who have churned rounded to 1 decimal place?
    
    SELECT COUNT(DISTINCT(customer_id)) as churn_count,
    ROUND(COUNT(DISTINCT(customer_id))*100.0/(SELECT COUNT(DISTINCT(s.customer_id)) FROM foodie_fi.subscriptions s), 1) as chur_percent
    FROM foodie_fi.subscriptions
    WHERE plan_id = 4;

| churn_count | chur_percent |
| ----------- | ------------ |
| 307         | 30.7         |

---
**Query #5** How many customers have churned straight after their initial free trial - what percentage is this rounded to the nearest whole number?
    
    SELECT COUNT(tbl.customer_id) as total_count, 
    ROUND(COUNT(tbl.customer_id)*100.0/(SELECT COUNT(DISTINCT(s.customer_id)) FROM foodie_fi.subscriptions s)) as percentage 
       FROM (
    		SELECT customer_id, plan_id, LAG(plan_id,1,0)
    		OVER(PARTITION BY customer_id ORDER BY start_date)
    		FROM foodie_fi.subscriptions
      	) tbl
    WHERE tbl.plan_id = 4 AND tbl.lag = 0;

| total_count | percentage |
| ----------- | ---------- |
| 92          | 9          |

---

**Query #6**

    WITH next_plan_cte AS
    (SELECT *, LEAD(plan_id, 1)
     OVER(PARTITION BY customer_id ORDER BY start_date) as next_plan
    FROM foodie_fi.subscriptions)
     
    SELECT next_plan, COUNT(*) as count_customer_plans, ROUND(100.0 * COUNT(*)/(SELECT COUNT(DISTINCT s1.customer_id) FROM foodie_fi.subscriptions s1), 1) as percentage_customer_plans
    FROM next_plan_cte
    WHERE plan_id = 0 AND next_plan IS NOT NULL
    GROUP BY next_plan;

| next_plan | count_customer_plans | percentage_customer_plans |
| --------- | -------------------- | ------------------------- |
| 1         | 546                  | 54.6                      |
| 2         | 325                  | 32.5                      |
| 3         | 37                   | 3.7                       |
| 4         | 92                   | 9.2                       |


---
**Query #7** What is the customer count and percentage breakdown of all 5 plan_name values at 2020-12-31?
    
    SELECT pl.plan_name, COUNT(s.customer_id) 
    FROM foodie_fi.subscriptions s
    JOIN foodie_fi.plans pl
    ON s.plan_id = pl.plan_id
    WHERE s.start_date = '2020-12-31'
    GROUP BY pl.plan_name;

| plan_name | count |
| --------- | ----- |
| churn     | 1     |

---
**Query #8** How many customers have upgraded to an annual plan in 2020?
    
    SELECT COUNT(DISTINCT(customer_id)) as total_count
    FROM foodie_fi.subscriptions
    WHERE plan_id = 3
    AND EXTRACT(YEAR FROM start_date) = 2020;

| total_count |
| ----------- |
| 195         |

---
**Query #9** How many days on average does it take for a customer to an annual plan from the day they join Foodie-Fi?

    WITH initial_date_cte AS
    (SELECT customer_id, start_date
    FROM foodie_fi.subscriptions
    WHERE plan_id = 0),
    annual_date_cte AS
    (SELECT customer_id, start_date
    FROM foodie_fi.subscriptions
    WHERE plan_id = 3)
    
    SELECT ROUND(AVG(adc.start_date - idc.start_date)) as avg_days
    FROM initial_date_cte idc
    JOIN annual_date_cte adc
    ON idc.customer_id = adc.customer_id;

| avg_days |
| -------- |
| 105      |

---
**Query #10** Can you further breakdown this average value into 30 day periods (i.e. 0-30 days, 31-60 days etc)

    WITH initial_date_cte AS
    (SELECT customer_id, start_date
    FROM foodie_fi.subscriptions
    WHERE plan_id = 0),
    
    annual_date_cte AS
    (SELECT customer_id, start_date
    FROM foodie_fi.subscriptions
    WHERE plan_id = 3),
    
    bins AS
    (SELECT WIDTH_BUCKET(adc.start_date - idc.start_date, 0, 360, 12) as upgrade_days 
    FROM initial_date_cte idc 
    JOIN annual_date_cte adc
    ON idc.customer_id = adc.customer_id)
    
    SELECT 
      ((upgrade_days - 1) * 30 || ' - ' ||   (upgrade_days) * 30) || ' days' AS breakdown, 
      COUNT(*) AS customers
    FROM bins
    GROUP BY upgrade_days
    ORDER BY upgrade_days;

| breakdown      | customers |
| -------------- | --------- |
| 0 - 30 days    | 48        |
| 30 - 60 days   | 25        |
| 60 - 90 days   | 33        |
| 90 - 120 days  | 35        |
| 120 - 150 days | 43        |
| 150 - 180 days | 35        |
| 180 - 210 days | 27        |
| 210 - 240 days | 4         |
| 240 - 270 days | 5         |
| 270 - 300 days | 1         |
| 300 - 330 days | 1         |
| 330 - 360 days | 1         |

---
**Query #11** How many customers downgraded from a pro monthly to a basic monthly plan in 2020?

    WITH pro_monthly_cte AS
    (SELECT customer_id, start_date
    FROM foodie_fi.subscriptions
    WHERE plan_id = 2),
    
    basic_monthly_cte AS
    (SELECT customer_id, start_date
    FROM foodie_fi.subscriptions
    WHERE plan_id = 0)
    
    SELECT COUNT(*) as downgraded_count
    FROM pro_monthly_cte pmc
    JOIN basic_monthly_cte bmc
    ON pmc.customer_id = bmc.customer_id
    WHERE pmc.start_date < bmc.start_date
    AND EXTRACT(YEAR FROM pmc.start_date) = '2020';

| downgraded_count |
| ---------------- |
| 0                |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/rHJhRrXy5hbVBNJ6F6b9gJ/16)
