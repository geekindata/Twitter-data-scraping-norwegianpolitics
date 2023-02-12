**Schema (PostgreSQL v13)**

---

**Cleaning the data** 

    UPDATE pizza_runner.customer_orders
    SET exclusions = NULL
    WHERE exclusions = 'null' 
    OR exclusions = '';

    UPDATE pizza_runner.customer_orders
    SET extras = NULL
    WHERE extras = 'null' 
    OR extras = '';

    UPDATE pizza_runner.runner_orders
    SET pickup_time = NULL
    WHERE pickup_time = 'null' 
    OR pickup_time = '';

    UPDATE pizza_runner.runner_orders
    SET distance = NULL
    WHERE distance = 'null' 
    OR distance = '';

    UPDATE pizza_runner.runner_orders
    SET duration = NULL
    WHERE duration = 'null' 
    OR duration = '';

    UPDATE pizza_runner.runner_orders
    SET cancellation = NULL
    WHERE cancellation NOT LIKE '%Cancellation';

---
<p align=center><b>A. Pizza Metrics</b>

---
**Query #1** How many pizzas were ordered?

    SELECT COUNT(*) as total_ordered
    FROM pizza_runner.customer_orders;

| total_ordered |
| ------------- |
| 14            |

---
**Query #2** How many unique customer orders were made?

    SELECT COUNT(DISTINCT(order_id)) as total_ordered
    FROM pizza_runner.customer_orders;

| total_ordered |
| ------------- |
| 10            |

---
**Query #3** How many successful orders were delivered by each runner?

    SELECT COUNT(*) as total_delivered
    FROM pizza_runner.runner_orders
    WHERE cancellation IS NULL;

| total_delivered |
| --------------- |
| 8               |

---
**Query #4** How many of each type of pizza was delivered?

    SELECT pizza_name, COUNT(*) as total_delivered
    FROM pizza_runner.pizza_names na
    INNER JOIN pizza_runner.customer_orders co
    ON na.pizza_id = co.pizza_id
    INNER JOIN pizza_runner.runner_orders ro
    ON ro.order_id = co.order_id
    WHERE ro.cancellation IS NULL
    GROUP BY na.pizza_name;

| pizza_name | total_delivered |
| ---------- | --------------- |
| Meatlovers | 9               |
| Vegetarian | 3               |

---
**Query #5** How many Vegetarian and Meatlovers were ordered by each customer?

    SELECT co.customer_id, na.pizza_name, COUNT(*) as total_ordered
    FROM pizza_runner.customer_orders co
    INNER JOIN pizza_runner.pizza_names na
    ON na.pizza_id = co.pizza_id
    GROUP BY co.customer_id, na.pizza_name
    ORDER BY co.customer_id, na.pizza_name;

| customer_id | pizza_name | total_ordered |
| ----------- | ---------- | ------------- |
| 101         | Meatlovers | 2             |
| 101         | Vegetarian | 1             |
| 102         | Meatlovers | 2             |
| 102         | Vegetarian | 1             |
| 103         | Meatlovers | 3             |
| 103         | Vegetarian | 1             |
| 104         | Meatlovers | 3             |
| 105         | Vegetarian | 1             |

---
**Query #6** What was the maximum number of pizzas delivered in a single order?

    SELECT COUNT(*) as max_pizza_delivered
    FROM pizza_runner.customer_orders co
    INNER JOIN pizza_runner.runner_orders ro
    ON ro.order_id = co.order_id
    WHERE ro.cancellation IS NULL
    GROUP BY co.order_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

| max_pizza_delivered |
| ------------------- |
| 3                   |
    
---
    
**Query #7**

    SELECT co.customer_id, 
    SUM(
      CASE
      	WHEN co.exclusions IS NOT NULL OR co.extras IS NOT NULL THEN 1
      	ELSE 0
      END
    ) as atleast_1_change,
    SUM(
      CASE
      	WHEN co.exclusions IS NULL AND co.extras IS NULL THEN 1
      	ELSE 0
      END
    ) as no_change
    FROM pizza_runner.customer_orders co
    JOIN pizza_runner.runner_orders ro
    ON co.order_id = ro.order_id
    WHERE ro.cancellation IS NULL
    GROUP BY co.customer_id
    ORDER BY co.customer_id;

| customer_id | atleast_1_change | no_change |
| ----------- | ---------------- | --------- |
| 101         | 0                | 2         |
| 102         | 0                | 3         |
| 103         | 3                | 0         |
| 104         | 2                | 1         |
| 105         | 1                | 0         |

---
**Query #8** How many pizzas were delivered that had both exclusions and extras?

    SELECT COUNT(co.pizza_id) 
    FROM pizza_runner.customer_orders co
    JOIN pizza_runner.runner_orders ro
    ON co.order_id = ro.order_id
    WHERE co.exclusions IS NOT NULL
    AND co.extras IS NOT NULL
    AND ro.cancellation IS NULL;

| count |
| ----- |
| 1     |

---
**Query #9** What was the total volume of pizzas ordered for each hour of the day?

    SELECT EXTRACT(HOUR FROM order_time) as hours, COUNT(pizza_id) as total_volume_of_pizzas 
    FROM pizza_runner.customer_orders
    GROUP BY EXTRACT(HOUR FROM order_time)
    ORDER BY EXTRACT(HOUR FROM order_time);

| hours | total_volume_of_pizzas |
| ----- | ---------------------- |
| 11    | 1                      |
| 13    | 3                      |
| 18    | 3                      |
| 19    | 1                      |
| 21    | 3                      |
| 23    | 3                      |
    
---
**Query #10** What was the volume of orders for each day of the week?

    SELECT to_char(co.order_time, 'Day') as week_day, COUNT(order_id)
    FROM pizza_runner.customer_orders co
    GROUP BY week_day;

| week_day  | count |
| --------- | ----- |
| Saturday  | 5     |
| Thursday  | 3     |
| Friday    | 1     |
| Wednesday | 5     |

---
<p align=center><b>B. Runner and Customer Experience</b>

---
**Query #1** How many runners signed up for each 1 week period? (i.e. week starts 2021-01-01)

    SELECT EXTRACT('week' FROM registration_date+3) as week, COUNT(runner_id) 
    FROM pizza_runner.runners
    GROUP BY EXTRACT('week' FROM registration_date+3)
    ORDER BY EXTRACT('week' FROM registration_date+3);

| week | count |
| ---- | ----- |
| 1    | 2     |
| 2    | 1     |
| 3    | 1     |

---
**Query #2** What was the average time in minutes it took for each runner to arrive at the Pizza Runner HQ to pickup the order?

    SELECT ro.runner_id, AVG((EXTRACT(minute from TO_TIMESTAMP(pickup_time, 'YYYY-MM-DD HH24:MI:ss') - order_time))+(EXTRACT(second from TO_TIMESTAMP(pickup_time, 'YYYY-MM-DD HH24:MI:ss') - order_time)/60)) as avg_pickup_duration_mins
    FROM pizza_runner.runner_orders ro
    JOIN pizza_runner.customer_orders co
    ON ro.order_id = co.order_id
    GROUP BY ro.runner_id;

| runner_id | avg_pickup_duration_mins |
| --------- | ------------------------ |
| 3         | 10.466666666666667       |
| 2         | 23.720000000000002       |
| 1         | 15.677777777777777       |

---
**Query #3** Is there any relationship between the number of pizzas and how long the order takes to prepare?

    SELECT co.order_id, COUNT(co.pizza_id), ROUND(AVG((EXTRACT(minute from TO_TIMESTAMP(pickup_time, 'YYYY-MM-DD HH24:MI:ss') - order_time))+(EXTRACT(second from TO_TIMESTAMP(pickup_time, 'YYYY-MM-DD HH24:MI:ss') - order_time)/60))) as avg_prep_time_mins
    FROM pizza_runner.runner_orders ro
    JOIN pizza_runner.customer_orders co
    ON ro.order_id = co.order_id
    GROUP BY co.order_id;

| order_id | count | avg_prep_time_mins |
| -------- | ----- | ------------------ |
| 1        | 1     | 11                 |
| 2        | 1     | 10                 |
| 3        | 2     | 21                 |
| 4        | 3     | 29                 |
| 5        | 1     | 10                 |
| 6        | 1     |                    |
| 7        | 1     | 10                 |
| 8        | 1     | 20                 |
| 9        | 1     |                    |
| 10       | 2     | 16                 |

---
**Query #4** What was the average distance travelled for each customer?

    SELECT co.customer_id, ROUND(AVG(substring(ro.distance from '\d*')::INTEGER), 1) as avg_dist_travelled
    FROM pizza_runner.runner_orders ro
    JOIN pizza_runner.customer_orders co
    ON ro.order_id = co.order_id
    GROUP BY co.customer_id
    ORDER BY co.customer_id;

| customer_id | avg_dist_travelled |
| ----------- | ------------------ |
| 101         | 20.0               |
| 102         | 16.3               |
| 103         | 23.0               |
| 104         | 10.0               |
| 105         | 25.0               |

---
**Query #5** What was the difference between the longest and shortest delivery times for all orders?

    SELECT (MAX(substring(duration from '\d*')::INTEGER) - MIN(substring(duration from '\d*')::INTEGER)) as duration_diff
    FROM pizza_runner.runner_orders;

| duration_diff |
| ------------- |
| 30            |

---
**Query #6** What was the average speed for each runner for each delivery and do you notice any trend for these values?

    SELECT runner_id, order_id, ROUND((substring(distance from '\d*')::INTEGER * 60.0)/(substring(duration from '\d*')::INTEGER), 1) as speed_kmph
    FROM pizza_runner.runner_orders
    WHERE cancellation IS NULL
    GROUP BY runner_id, order_id, distance, duration
    ORDER BY runner_id, order_id;

| runner_id | order_id | speed_kmph |
| --------- | -------- | ---------- |
| 1         | 1        | 37.5       |
| 1         | 2        | 44.4       |
| 1         | 3        | 39.0       |
| 1         | 10       | 60.0       |
| 2         | 4        | 34.5       |
| 2         | 7        | 60.0       |
| 2         | 8        | 92.0       |
| 3         | 5        | 40.0       |

---
**Query #7** What is the successful delivery percentage for each runner?

    SELECT r1.runner_id, ROUND(COUNT(r1.order_id)*100.0/(SELECT COUNT(*) FROM pizza_runner.runner_orders WHERE runner_id = r1.runner_id)) as delivery_percentage
    FROM pizza_runner.runner_orders r1
    WHERE r1.cancellation IS NULL
    GROUP BY r1.runner_id
    ORDER BY COUNT(r1.order_id) > 0;

| runner_id | delivery_percentage |
| --------- | ------------------- |
| 1         | 100                 |
| 2         | 75                  |
| 3         | 50                  |

---
<p align=center><b>D. Pricing and Ratings</b>

---
**Query #1** If a Meat Lovers pizza costs $12 and Vegetarian costs $10 and there were no charges for changes - how much money has Pizza Runner made so far if there are no delivery fees?

    WITH costs AS (
    SELECT *, 
    CASE
    	WHEN pn.pizza_name = 'Meatlovers' THEN 12
        ELSE 10
    END as pizza_cost
    FROM pizza_runner.customer_orders co
    JOIN pizza_runner.pizza_names pn
    ON co.pizza_id = pn.pizza_id
    JOIN pizza_runner.runner_orders ro
    ON ro.order_id = co.order_id
    WHERE ro.cancellation IS NULL
    )
    
    SELECT SUM(costs.pizza_cost) as total_money_made FROM costs;

| total_money_made |
| ---------------- |
| 138              |

---
**Query #2** What if there was an additional $1 charge for any pizza extras? Add cheese is $1 extra.

    WITH costs AS (
    SELECT *, 
    CASE
    	WHEN pn.pizza_name = 'Meatlovers' THEN 12
        ELSE 10
    END as pizza_cost
    FROM pizza_runner.customer_orders co
    JOIN pizza_runner.pizza_names pn
    ON co.pizza_id = pn.pizza_id
    JOIN pizza_runner.runner_orders ro
    ON ro.order_id = co.order_id
    WHERE ro.cancellation IS NULL
    ), extra_costs as (
    SELECT costs.extras, costs.pizza_cost as total_money_made,
    CASE
    	WHEN costs.extras IS NOT NULL THEN 
        	CASE
            	WHEN costs.extras LIKE '%4%' THEN costs.pizza_cost+2
                ELSE costs.pizza_cost+1
            END
        ELSE costs.pizza_cost
    END as adjusted_money_made
    FROM costs
    )
    
    SELECT SUM(extra_costs.adjusted_money_made) as total_money_made_using_extras FROM extra_costs;

| total_money_made_using_extras |
| ----------------------------- |
| 142                           |
    
---
**Query #3** The Pizza Runner team now wants to add an additional ratings system that allows customers to rate their runner, how would you design an additional table for this new dataset - generate a schema for this new table and insert your own data for ratings for each successful customer order between 1 to 5.

    DROP TABLE IF EXISTS pizza_runner.ratings;
    CREATE TABLE pizza_runner.ratings (
      "order_id" INTEGER,
      "rating" INTEGER,
      "comments" VARCHAR(50)
    );

    INSERT INTO pizza_runner.ratings
    VALUES (1, 4, 'Good');
    INSERT INTO pizza_runner.ratings
    VALUES (3, 5, 'Excellent Service');
    INSERT INTO pizza_runner.ratings
    VALUES (5, 3, 'Delay in delivery');
    INSERT INTO pizza_runner.ratings
    VALUES (2, 1, 'Not satisfied');
    INSERT INTO pizza_runner.ratings
    VALUES (4, 5, 'Happy');

    SELECT * FROM pizza_runner.ratings;

| order_id | rating | comments          |
| -------- | ------ | ----------------- |
| 1        | 4      | Good              |
| 3        | 5      | Excellent Service |
| 5        | 3      | Delay in delivery |
| 2        | 1      | Not satisfied     |
| 4        | 5      | Happy             |

---
**Query #4** If a Meat Lovers pizza was $12 and Vegetarian $10 fixed prices with no cost for extras and each runner is paid $0.30 per kilometre traveled - how much money does Pizza Runner have left over after these deliveries?

    WITH costs AS (
    SELECT *, 
    CASE
    	WHEN pn.pizza_name = 'Meatlovers' THEN 12
        ELSE 10
    END as pizza_cost,
    ((substring(ro.distance from '\d*')::INTEGER) * 0.30) as dist_cost
    FROM pizza_runner.customer_orders co
    JOIN pizza_runner.pizza_names pn
    ON co.pizza_id = pn.pizza_id
    JOIN pizza_runner.runner_orders ro
    ON ro.order_id = co.order_id
    WHERE ro.cancellation IS NULL
    )
    
    SELECT SUM(pizza_cost - dist_cost) as money_left FROM costs;

| money_left |
| ---------- |
| 74.10      |

---
<p align=center><b>E. Bonus Questions</b>

---
**If Danny wants to expand his range of pizzas - how would this impact the existing data design? Write an INSERT statement to demonstrate what would happen if a new Supreme pizza with all the toppings was added to the Pizza Runner menu?**

    INSERT INTO pizza_runner.pizza_names
    VALUES(3, 'Supreme');

    INSERT INTO pizza_runner.pizza_recipes
    VALUES(3, '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12');

---
**Query #1**

    SELECT * FROM pizza_runner.pizza_names;

| pizza_id | pizza_name |
| -------- | ---------- |
| 1        | Meatlovers |
| 2        | Vegetarian |
| 3        | Supreme    |

---
**Query #2**

    SELECT * FROM pizza_runner.pizza_recipes;

| pizza_id | toppings                              |
| -------- | ------------------------------------- |
| 1        | 1, 2, 3, 4, 5, 6, 8, 10               |
| 2        | 4, 6, 7, 9, 11, 12                    |
| 3        | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/7VcQKQwsS3CTkGRFG7vu98/65)
