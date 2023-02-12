**Schema (PostgreSQL v15 (Beta))**

---

**Query #1** What is the total amount each customer spent at the restaurant?

    SELECT sa.customer_id, SUM(me.price) as Total_Spend
    FROM dannys_diner.sales sa
    INNER JOIN dannys_diner.menu me
    ON sa.product_id = me.product_id
    GROUP BY sa.customer_id;

| customer_id | total_spend |
| ----------- | ----------- |
| B           | 74          |
| C           | 36          |
| A           | 76          |

---
**Query #2** How many days has each customer visited the restaurant?

    SELECT customer_id, count(distinct(order_date)) as Total_Visits
    FROM dannys_diner.sales
    GROUP BY customer_id;

| customer_id | total_visits |
| ----------- | ------------ |
| A           | 4            |
| B           | 6            |
| C           | 2            |

---
**Query #3** What was the first item from the menu purchased by each customer?

    SELECT tbl.customer_id, tbl.product_id
    FROM
    	(SELECT *, RANK()
    	OVER(PARTITION BY customer_id ORDER BY order_date)
    	FROM dannys_diner.sales) AS tbl
    WHERE tbl.rank=1;

| customer_id | product_id |
| ----------- | ---------- |
| A           | 1          |
| A           | 2          |
| B           | 2          |
| C           | 3          |
| C           | 3          |

---
**Query #4** What is the most purchased item on the menu and how many times was it purchased by all customers?

    SELECT customer_id, count(product_id)
    FROM dannys_diner.sales
    WHERE product_id = (
      	SELECT product_id 
    	FROM dannys_diner.sales
    	GROUP BY product_id
    	ORDER BY count(product_id) DESC
    	LIMIT 1
      )
    GROUP BY customer_id;

| customer_id | count |
| ----------- | ----- |
| B           | 2     |
| A           | 3     |
| C           | 3     |

---
**Query #5** Which item was the most popular for each customer?

    SELECT tbl2.customer_id, tbl2.product_id
    FROM
    	(SELECT tbl.*, RANK()
    	OVER(PARTITION BY tbl.customer_id ORDER BY tbl.cnt DESC)
    	FROM (
    		SELECT customer_id, product_id, count(product_id) as cnt
    		FROM dannys_diner.sales
    		GROUP BY customer_id, product_id
    		ORDER BY customer_id, count(product_id) DESC
      	) as tbl
     	) as tbl2
    WHERE tbl2.rank=1;

| customer_id | product_id |
| ----------- | ---------- |
| A           | 3          |
| B           | 3          |
| B           | 1          |
| B           | 2          |
| C           | 3          |

---
**Query #6** Which item was purchased first by the customer after they became a member?

    SELECT tbl.customer_id, tbl.product_id
    FROM (
		SELECT sa.customer_id, sa.product_id, sa.order_date, me.join_date, RANK() OVER(PARTITION BY sa.customer_id ORDER BY sa.order_date)
		FROM dannys_diner.sales sa
		INNER JOIN dannys_diner.members me
		ON sa.customer_id = me.customer_id
		AND sa.order_date>me.join_date
  	) as tbl
    WHERE tbl.rank=1;

| customer_id | product_id |
| ----------- | ---------- |
| A           | 3          |
| B           | 1          |

---
**Query #7** Which item was purchased just before the customer became a member?

     SELECT tbl1.customer_id, tbl1.product_id
     FROM (
    		SELECT sa.customer_id, sa.product_id, sa.order_date, me.join_date, RANK() OVER(PARTITION BY sa.customer_id ORDER BY sa.order_date DESC)
    		FROM dannys_diner.sales sa
    		INNER JOIN dannys_diner.members me
    		ON sa.customer_id = me.customer_id
    		AND sa.order_date<=me.join_date
      	) as tbl1
    WHERE tbl1.rank=1;

| customer_id | product_id |
| ----------- | ---------- |
| A           | 2          |
| B           | 1          |

---
**Query #8** What is the total items and amount spent for each member before they became a member?

    SELECT sa.customer_id, COUNT(sa.product_id), SUM(men.price) 
    FROM dannys_diner.sales sa
    INNER JOIN dannys_diner.members me
    ON sa.customer_id = me.customer_id
    INNER JOIN dannys_diner.menu men
    ON men.product_id = sa.product_id
    AND sa.order_date < me.join_date
    GROUP BY sa.customer_id;

| customer_id | count | sum |
| ----------- | ----- | --- |
| B           | 3     | 40  |
| A           | 2     | 25  |

---
**Query #9** If each $1 spent equates to 10 points and sushi has a 2x points multiplier - how many points would each customer have?

    SELECT tbl.customer_id, SUM(tbl.points) 
    FROM (
    	SELECT sa.customer_id, men.product_name, men.price,
    	CASE
    		WHEN men.product_name = 'sushi' THEN men.price*20
        	ELSE men.price*10
    	END as points
    	FROM dannys_diner.sales sa
    	INNER JOIN dannys_diner.menu men
    	ON sa.product_id = men.product_id
    	) AS tbl
    GROUP BY tbl.customer_id;

| customer_id | sum |
| ----------- | --- |
| B           | 94  |
| C           | 36  |
| A           | 86  |

---
**Query #10** In the first week after a customer joins the program (including their join date) they earn 2x points on all items, not just sushi - how many points do customer A and B have at the end of January?

    SELECT tbl.customer_id, SUM(tbl.points) 
    FROM 
    	(SELECT sa.customer_id, sa.order_date, men.product_id, 
    	CASE
    		WHEN me.join_date + 7 >= sa.order_date THEN men.price * 20
       	 	ELSE men.price * 10
    	END as points
    	FROM dannys_diner.sales sa
    	INNER JOIN dannys_diner.members me
    	ON sa.customer_id = me.customer_id
    	AND sa.order_date >= me.join_date
    	INNER JOIN dannys_diner.menu men
    	ON men.product_id = sa.product_id
    	WHERE date_part('month', order_date)=1
    	) as tbl
    GROUP BY tbl.customer_id;

| customer_id | sum |
| ----------- | --- |
| B           | 44  |
| A           | 102 |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/2rM8RAnq7h5LLDTzZiRWcd/138)
