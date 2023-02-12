**Schema (PostgreSQL v13)**
  
---
<p align=center><b>High Level Sales Analysis</b>

---

**Query #1** What was the total quantity sold for all products?

    SELECT SUM(qty) as total_quantity
    FROM balanced_tree.sales;

| total_quantity |
| -------------- |
| 45216          |

---
**Query #2** What is the total generated revenue for all products before discounts?

    SELECT SUM(price + discount) as revenue_before_discount
    FROM balanced_tree.sales;

| revenue_before_discount |
| ----------------------- |
| 611990                  |

---
**Query #3** What was the total discount amount for all products?

    SELECT SUM(discount) as total_discount
    FROM balanced_tree.sales;

| total_discount |
| -------------- |
| 182700         |

---
<p align=center><b>Transaction Analysis</b>

---
**Query #1** How many unique transactions were there?

    SELECT COUNT(DISTINCT(txn_id)) as unique_transactions
    FROM balanced_tree.sales;

| unique_transactions |
| ------------------- |
| 2500                |

---
**Query #3** What are the 25th, 50th and 75th percentile values for the revenue per transaction?

    SELECT txn_id, PERCENTILE_DISC(0.25) WITHIN GROUP (ORDER BY price + discount) AS perc_25, PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY price + discount) AS perc_50, PERCENTILE_DISC(0.75) WITHIN GROUP (ORDER BY price + discount) AS perc_75
    FROM balanced_tree.sales
    GROUP BY txn_id
    LIMIT 10;

| txn_id | perc_25 | perc_50 | perc_75 |
| ------ | ------- | ------- | ------- |
| 000027 | 26      | 42      | 49      |
| 000106 | 22      | 31      | 52      |
| 000dd8 | 16      | 19      | 38      |
| 003920 | 35      | 41      | 58      |
| 003c6d | 30      | 36      | 49      |
| 003ea6 | 16      | 19      | 29      |
| 0053d3 | 37      | 52      | 60      |
| 00a68b | 20      | 36      | 61      |
| 00c8dc | 18      | 25      | 44      |
| 00d139 | 34      | 41      | 56      |


---
**Query #4** What is the average discount value per transaction?

    SELECT SUM(discount)/(SELECT COUNT(*) FROM balanced_tree.sales) as avg_discount_per_transaction
    FROM balanced_tree.sales;

| avg_discount_per_transaction |
| ---------------------------- |
| 12                           |

---
**Query #5** What is the percentage split of all transactions for members vs non-members?

    SELECT 
    CASE
    	WHEN member = true THEN 'members'
        ELSE 'non-members'
    END as Membership
    , ROUND(100.0 * COUNT(DISTINCT txn_id)/(SELECT COUNT(DISTINCT sa.txn_id) FROM balanced_tree.sales sa), 1) as txn_percentage_split
    FROM balanced_tree.sales
    GROUP BY member;

| membership  | txn_percentage_split |
| ----------- | -------------------- |
| non-members | 39.8                 |
| members     | 60.2                 |

---
**Query #6** What is the average revenue for member transactions and non-member transactions?

    SELECT 
    CASE
    	WHEN member = true THEN 'members'
        ELSE 'non-members'
    END as Membership
    , ROUND(AVG(price + discount), 1) as avg_revenue
    FROM balanced_tree.sales
    GROUP BY member;

| membership  | avg_revenue |
| ----------- | ----------- |
| non-members | 40.4        |
| members     | 40.6        |

---
<p align=center><b>Product Analysis</b>
  
---

**Query #1** What are the top 3 products by total revenue before discount?

    SELECT pd.product_name, SUM(sa.qty * sa.price) as rev_before_dis
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY sa.prod_id, pd.product_name
    ORDER BY rev_before_dis DESC
    LIMIT 3;

| product_name                 | rev_before_dis |
| ---------------------------- | -------------- |
| Blue Polo Shirt - Mens       | 217683         |
| Grey Fashion Jacket - Womens | 209304         |
| White Tee Shirt - Mens       | 152000         |

---
**Query #2** What is the total quantity, revenue and discount for each segment?

    SELECT pd.segment_id, SUM(sa.qty) as total_quantity, SUM((sa.qty * sa.price) - sa.discount) as total_revenue, SUM(sa.discount) as total_discount
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.segment_id
    ORDER BY pd.segment_id;

| segment_id | total_quantity | total_revenue | total_discount |
| ---------- | -------------- | ------------- | -------------- |
| 3          | 11349          | 162610        | 45740          |
| 4          | 11385          | 321531        | 45452          |
| 5          | 11265          | 360100        | 46043          |
| 6          | 11217          | 262512        | 45465          |

---
**Query #3** What is the top selling product for each segment?

    WITH rnk_cte AS (
    SELECT pd.segment_id, pd.product_id, pd.product_name, RANK() OVER(PARTITION BY pd.segment_id ORDER BY SUM((sa.qty * sa.price) - sa.discount) DESC)
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.segment_id, pd.product_id, pd.product_name)
    
    SELECT segment_id, product_name as top_selling_product
    FROM rnk_cte 
    WHERE rank = 1;

| segment_id | top_selling_product           |
| ---------- | ----------------------------- |
| 3          | Black Straight Jeans - Womens |
| 4          | Grey Fashion Jacket - Womens  |
| 5          | Blue Polo Shirt - Mens        |
| 6          | Navy Solid Socks - Mens       |

---
**Query #4** What is the total quantity, revenue and discount for each category?

    SELECT pd.category_id, SUM(sa.qty) as total_quantity, SUM((sa.qty * sa.price) - sa.discount) as total_revenue, SUM(sa.discount) as total_discount
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.category_id
    ORDER BY pd.category_id;

| category_id | total_quantity | total_revenue | total_discount |
| ----------- | -------------- | ------------- | -------------- |
| 1           | 22734          | 484141        | 91192          |
| 2           | 22482          | 622612        | 91508          |

---
**Query #5** What is the top selling product for each category?

    WITH rnk_cte AS (
    SELECT pd.category_id, pd.product_id, pd.product_name, RANK() OVER(PARTITION BY pd.category_id ORDER BY SUM((sa.qty * sa.price) - sa.discount) DESC)
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.category_id, pd.product_id, pd.product_name)
    
    SELECT category_id, product_name as top_selling_product
    FROM rnk_cte 
    WHERE rank = 1;

| category_id | top_selling_product          |
| ----------- | ---------------------------- |
| 1           | Grey Fashion Jacket - Womens |
| 2           | Blue Polo Shirt - Mens       |

---
**Query #6** What is the percentage split of revenue by product for each segment?

    SELECT pd.segment_id, pd.product_id, ROUND(100.0 * SUM((sa.qty * sa.price) - sa.discount)/(SELECT SUM((sa2.qty*sa2.price)-sa2.discount) FROM balanced_tree.sales sa2 JOIN balanced_tree.product_details pd2 ON sa2.prod_id = pd2.product_id WHERE pd2.segment_id = pd.segment_id),1) as rev_percentage_split
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.segment_id, pd.product_id
    ORDER BY pd.segment_id;

| segment_id | product_id | rev_percentage_split |
| ---------- | ---------- | -------------------- |
| 3          | c4a632     | 21.3                 |
| 3          | e31d39     | 13.5                 |
| 3          | e83aa3     | 65.1                 |
| 4          | d5e9a6     | 22.3                 |
| 4          | 9ec847     | 60.3                 |
| 4          | 72f5d4     | 17.4                 |
| 5          | 5d267b     | 37.9                 |
| 5          | c8d436     | 6.0                  |
| 5          | 2a2353     | 56.1                 |
| 6          | 2feb6b     | 36.0                 |
| 6          | f084eb     | 46.0                 |
| 6          | b9a74d     | 18.0                 |

---
**Query #7** What is the percentage split of revenue by segment for each category?

    SELECT pd.category_id, pd.segment_id, ROUND(100.0 * SUM((sa.qty * sa.price) - sa.discount)/(SELECT SUM((sa2.qty*sa2.price)-sa2.discount) FROM balanced_tree.sales sa2 JOIN balanced_tree.product_details pd2 ON sa2.prod_id = pd2.product_id WHERE pd2.category_id = pd.category_id),1) as rev_percentage_split
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.category_id, pd.segment_id 
    ORDER BY pd.category_id;

| category_id | segment_id | rev_percentage_split |
| ----------- | ---------- | -------------------- |
| 1           | 3          | 33.6                 |
| 1           | 4          | 66.4                 |
| 2           | 6          | 42.2                 |
| 2           | 5          | 57.8                 |

---
**Query #8** What is the percentage split of total revenue by category?

    SELECT pd.category_id, ROUND(100.0*SUM((sa.qty*sa.price)-sa.discount)/(SELECT SUM((sa2.qty*sa2.price)-sa2.discount) FROM balanced_tree.sales sa2),1) as rev_percentage_split
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.category_id
    ORDER BY pd.category_id;

| category_id | rev_percentage_split |
| ----------- | -------------------- |
| 1           | 43.7                 |
| 2           | 56.3                 |

---
**Query #9** What is the total transaction “penetration” for each product? (hint: penetration = number of transactions where at least 1 quantity of a product was purchased divided by total number of transactions)

    SELECT pd.product_name, ROUND(1.0*(SELECT COUNT(DISTINCT sa2.txn_id) FROM balanced_tree.sales sa2 WHERE sa2.prod_id = pd.product_id)/(SELECT COUNT(DISTINCT sa3.txn_id) FROM balanced_tree.sales sa3),4) as penetration
    FROM balanced_tree.sales sa
    JOIN balanced_tree.product_details pd
    ON sa.prod_id = pd.product_id
    GROUP BY pd.product_id, pd.product_name;

| product_name                     | penetration |
| -------------------------------- | ----------- |
| Blue Polo Shirt - Mens           | 0.5072      |
| Black Straight Jeans - Womens    | 0.4984      |
| Cream Relaxed Jeans - Womens     | 0.4972      |
| White Striped Socks - Mens       | 0.4972      |
| Navy Oversized Jeans - Womens    | 0.5096      |
| White Tee Shirt - Mens           | 0.5072      |
| Teal Button Up Shirt - Mens      | 0.4968      |
| Indigo Rain Jacket - Womens      | 0.5000      |
| Khaki Suit Jacket - Womens       | 0.4988      |
| Grey Fashion Jacket - Womens     | 0.5100      |
| Navy Solid Socks - Mens          | 0.5124      |
| Pink Fluro Polkadot Socks - Mens | 0.5032      |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/8HVy4RyoBiqB4QaFGwFRJC/0)
