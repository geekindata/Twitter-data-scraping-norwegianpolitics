**Schema (PostgreSQL v13)**

---
<p align=center><b>A. Customer Nodes Exploration</b>

---

**Query #1** How many unique nodes are there on the Data Bank system?

    SELECT COUNT(DISTINCT(node_id)) as unique_nodes
    FROM data_bank.customer_nodes;

| unique_nodes |
| ------------ |
| 5            |

---
**Query #2** What is the number of nodes per region?

    SELECT region_id, COUNT(DISTINCT(node_id)) node_count
    FROM data_bank.customer_nodes
    GROUP BY region_id;

| region_id | node_count |
| --------- | ---------- |
| 1         | 5          |
| 2         | 5          |
| 3         | 5          |
| 4         | 5          |
| 5         | 5          |

---
**Query #3** How many customers are allocated to each region?

    SELECT region_id, COUNT(DISTINCT(customer_id)) as customer_count
    FROM data_bank.customer_nodes
    GROUP BY region_id;

| region_id | customer_count |
| --------- | -------------- |
| 1         | 110            |
| 2         | 105            |
| 3         | 102            |
| 4         | 95             |
| 5         | 88             |

---
**Query #4** How many days on average are customers reallocated to a different node?

    SELECT AVG(end_date - start_date) as average_days FROM data_bank.customer_nodes;

| average_days        |
| ------------------- |
| 416373.411714285714 |

---
**Query #5** What is the median, 80th and 95th percentile for this same reallocation days metric for each region?

    SELECT region_id, PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY end_date - start_date) as median_percentile_50, PERCENTILE_CONT(0.8) WITHIN GROUP(ORDER BY end_date - start_date) as percentile_80, PERCENTILE_CONT(0.95) WITHIN GROUP(ORDER BY end_date - start_date) as percentile_95 FROM data_bank.customer_nodes
    GROUP BY region_id;

| region_id | median_percentile_50 | percentile_80 | percentile_95 |
| --------- | -------------------- | ------------- | ------------- |
| 1         | 17                   | 28            | 2914533.55    |
| 2         | 18                   | 27            | 2914534.3     |
| 3         | 17.5                 | 27            | 2914535.35    |
| 4         | 17                   | 27            | 2914538       |
| 5         | 18                   | 28            | 2914527       |

---
<p align=center><b>B. Customer Transactions</b>

---
**Query #1** What is the unique count and total amount for each transaction type?

    SELECT txn_type, COUNT(txn_amount) as unique_count, SUM(txn_amount) as total_amount 
    FROM data_bank.customer_transactions
    GROUP BY txn_type;

| txn_type   | unique_count | total_amount |
| ---------- | ------------ | ------------ |
| purchase   | 1617         | 806537       |
| deposit    | 2671         | 1359168      |
| withdrawal | 1580         | 793003       |

---
**Query #2** What is the average total historical deposit counts and amounts for all customers?

    SELECT COUNT(*) as deposit_counts, AVG(txn_amount) as average_amounts
    FROM data_bank.customer_transactions
    WHERE txn_type = 'deposit';

| deposit_counts | average_amounts      |
| -------------- | -------------------- |
| 2671           | 508.8611007113440659 |

---
**Query #3** For each month - how many Data Bank customers make more than 1 deposit and either 1 purchase or 1 withdrawal in a single month?

    WITH txn_cte AS
    (SELECT EXTRACT(MONTH FROM txn_date) as month_num, TO_CHAR(txn_date, 'Month') as month_name, customer_id,
     SUM(CASE
         	WHEN txn_type = 'deposit' THEN 1
         	ELSE 0
        END) as deposit_count,
     SUM(CASE
         	WHEN txn_type = 'purchase' THEN 1
         	ELSE 0
        END) as purchase_count,
     SUM(CASE
         	WHEN txn_type = 'withdrawal' THEN 1
         	ELSE 0
        END) as withdrawal_count
    FROM data_bank.customer_transactions
    GROUP BY month_num, month_name, customer_id
    ORDER BY month_num, customer_id)
    
    SELECT month_name, COUNT(*) 
    FROM txn_cte
    WHERE deposit_count > 1 AND
    (purchase_count = 1 OR withdrawal_count = 1)
    GROUP BY month_num, month_name
    ORDER BY month_num;

| month_name | count |
| ---------- | ----- |
| January    | 115   |
| February   | 108   |
| March      | 113   |
| April      | 50    |

---
**Query #4** What is the closing balance for each customer at the end of the month?

    WITH txn_cte AS
    (SELECT customer_id, EXTRACT(MONTH FROM txn_date) as month_num, TO_CHAR(txn_date, 'Month') as month_name,
     SUM(CASE
         	WHEN txn_type = 'deposit' THEN txn_amount
         	ELSE 0
        END) as deposit_amt,
     SUM(CASE
         	WHEN txn_type = 'purchase' THEN txn_amount
         	ELSE 0
        END) as purchase_amt,
     SUM(CASE
         	WHEN txn_type = 'withdrawal' THEN txn_amount
         	ELSE 0
        END) as withdrawal_amt
    FROM data_bank.customer_transactions
    GROUP BY customer_id, month_num, month_name
    ORDER BY customer_id, month_num)
    
    SELECT customer_id, month_name, SUM(deposit_amt - purchase_amt - withdrawal_amt) OVER(PARTITION BY customer_id ORDER BY month_num) AS closing_balance
    FROM txn_cte
    ORDER BY customer_id, month_num;

| customer_id | month_name | closing_balance |
| ----------- | ---------- | --------------- |
| 1           | January    | 312             |
| 1           | March      | -640            |
| 2           | January    | 549             |
| 2           | March      | 610             |
| 3           | January    | 144             |
| 3           | February   | -821            |
| 3           | March      | -1222           |
| 3           | April      | -729            |
| 4           | January    | 848             |
| 4           | March      | 655             |
| 5           | January    | 954             |
| 5           | March      | -1923           |
| 5           | April      | -2413           |
| 6           | January    | 733             |
| 6           | February   | -52             |
| 6           | March      | 340             |
| 7           | January    | 964             |
| 7           | February   | 3173            |
| 7           | March      | 2533            |
| 7           | April      | 2623            |
| 8           | January    | 587             |
| 8           | February   | 407             |
| 8           | March      | -57             |
| 8           | April      | -1029           |
| 9           | January    | 849             |
| 9           | February   | 654             |
| 9           | March      | 1584            |
| 9           | April      | 862             |
| 10          | January    | -1622           |
| 10          | February   | -1342           |
| 10          | March      | -2753           |
| 10          | April      | -5090           |
| 11          | January    | -1744           |
| 11          | February   | -2469           |
| 11          | March      | -2088           |
| 11          | April      | -2416           |
| 12          | January    | 92              |
| 12          | March      | 295             |
| 13          | January    | 780             |
| 13          | February   | 1279            |
| 13          | March      | 1405            |
| 14          | January    | 205             |
| 14          | February   | 821             |
| 14          | April      | 989             |
| 15          | January    | 379             |
| 15          | April      | 1102            |
| 16          | January    | -1341           |
| 16          | February   | -2893           |
| 16          | March      | -4284           |
| 16          | April      | -3422           |
| 17          | January    | 465             |
| 17          | February   | -892            |
| 18          | January    | 757             |
| 18          | February   | -424            |
| 18          | March      | -842            |
| 18          | April      | -815            |
| 19          | January    | -12             |
| 19          | February   | -251            |
| 19          | March      | -301            |
| 19          | April      | 42              |
| 20          | January    | 465             |
| 20          | February   | 519             |
| 20          | March      | 776             |
| 21          | January    | -204            |
| 21          | February   | -764            |
| 21          | March      | -1874           |
| 21          | April      | -3253           |
| 22          | January    | 235             |
| 22          | February   | -1039           |
| 22          | March      | -149            |
| 22          | April      | -1358           |
| 23          | January    | 94              |
| 23          | February   | -314            |
| 23          | March      | -156            |
| 23          | April      | -678            |
| 24          | January    | 615             |
| 24          | February   | 813             |
| 24          | March      | 254             |
| 25          | January    | 174             |
| 25          | February   | -400            |
| 25          | March      | -1220           |
| 25          | April      | -304            |
| 26          | January    | 638             |
| 26          | February   | -31             |
| 26          | March      | -622            |
| 26          | April      | -1870           |
| 27          | January    | -1189           |
| 27          | February   | -713            |
| 27          | March      | -3116           |
| 28          | January    | 451             |
| 28          | February   | -818            |
| 28          | March      | -1228           |
| 28          | April      | 272             |
| 29          | January    | -138            |
| 29          | February   | -76             |
| 29          | March      | 831             |
| 29          | April      | -548            |
| 30          | January    | 33              |
| 30          | February   | -431            |
| 30          | April      | 508             |
| 31          | January    | 83              |
| 31          | March      | -141            |
| 32          | January    | -89             |
| 32          | February   | 376             |
| 32          | March      | -843            |
| 32          | April      | -1001           |
| 33          | January    | 473             |
| 33          | February   | -116            |
| 33          | March      | 1225            |
| 33          | April      | 989             |
| 34          | January    | 976             |
| 34          | February   | -347            |
| 34          | March      | -185            |
| 35          | January    | 507             |
| 35          | February   | -821            |
| 35          | March      | -1163           |
| 36          | January    | 149             |
| 36          | February   | 290             |
| 36          | March      | 1041            |
| 36          | April      | 427             |
| 37          | January    | 85              |
| 37          | February   | 902             |
| 37          | March      | -1069           |
| 37          | April      | -959            |
| 38          | January    | 367             |
| 38          | February   | -465            |
| 38          | March      | -798            |
| 38          | April      | -1246           |
| 39          | January    | 1429            |
| 39          | February   | 2388            |
| 39          | March      | 2460            |
| 39          | April      | 2516            |
| 40          | January    | 347             |
| 40          | February   | 295             |
| 40          | March      | 659             |
| 40          | April      | -208            |
| 41          | January    | -46             |
| 41          | February   | 1379            |
| 41          | March      | 3441            |
| 41          | April      | 2525            |
| 42          | January    | 447             |
| 42          | February   | 1067            |
| 42          | March      | -887            |
| 42          | April      | -1886           |
| 43          | January    | -201            |
| 43          | February   | -406            |
| 43          | March      | 869             |
| 43          | April      | 545             |
| 44          | January    | -690            |
| 44          | February   | -19             |
| 44          | April      | -339            |
| 45          | January    | 940             |
| 45          | February   | -1152           |
| 45          | March      | 584             |
| 46          | January    | 522             |
| 46          | February   | 1388            |
| 46          | March      | 80              |
| 46          | April      | 104             |
| 47          | January    | -1153           |
| 47          | February   | -1283           |
| 47          | March      | -2862           |
| 47          | April      | -3169           |
| 48          | January    | -2368           |
| 48          | February   | -2972           |
| 48          | March      | -3745           |
| 49          | January    | -397            |
| 49          | February   | -594            |
| 49          | March      | -2556           |
| 50          | January    | 931             |
| 50          | February   | -674            |
| 50          | March      | 275             |
| 50          | April      | 450             |
| 51          | January    | 301             |
| 51          | February   | -97             |
| 51          | March      | 779             |
| 51          | April      | 1364            |
| 52          | January    | 1140            |
| 52          | February   | 2612            |
| 53          | January    | 22              |
| 53          | February   | 210             |
| 53          | March      | -728            |
| 53          | April      | 227             |
| 54          | January    | 1658            |
| 54          | February   | 1629            |
| 54          | March      | 533             |
| 54          | April      | 968             |
| 55          | January    | 380             |
| 55          | February   | -410            |
| 55          | March      | 349             |
| 55          | April      | -513            |
| 56          | January    | -67             |
| 56          | February   | -1646           |
| 56          | March      | -2075           |
| 56          | April      | -3866           |
| 57          | January    | 414             |
| 57          | February   | -101            |
| 57          | March      | -866            |
| 58          | January    | 383             |
| 58          | February   | 1697            |
| 58          | March      | -1196           |
| 58          | April      | -635            |
| 59          | January    | 924             |
| 59          | February   | 2190            |
| 59          | March      | 1652            |
| 59          | April      | 798             |
| 60          | January    | -189            |
| 60          | February   | 668             |
| 60          | March      | -745            |
| 60          | April      | -1169           |
| 61          | January    | 222             |
| 61          | February   | 323             |
| 61          | March      | -1710           |
| 61          | April      | -2237           |
| 62          | January    | -212            |
| 62          | March      | -763            |
| 63          | January    | -332            |
| 63          | February   | -953            |
| 63          | March      | -3946           |
| 64          | January    | 2332            |
| 64          | February   | 1554            |
| 64          | March      | 245             |
| 65          | January    | 25              |
| 65          | March      | -450            |
| 65          | April      | -1381           |
| 66          | January    | 1971            |
| 66          | February   | 1492            |
| 66          | March      | -517            |
| 67          | January    | 1593            |
| 67          | February   | 2565            |
| 67          | March      | 2050            |
| 67          | April      | 1222            |
| 68          | January    | 574             |
| 68          | February   | 278             |
| 68          | March      | -456            |
| 69          | January    | 23              |
| 69          | February   | -1944           |
| 69          | March      | -2338           |
| 69          | April      | -3085           |
| 70          | January    | -584            |
| 70          | February   | -63             |
| 70          | March      | -1814           |
| 71          | January    | 128             |
| 71          | February   | -673            |
| 71          | March      | -1265           |
| 72          | January    | 796             |
| 72          | February   | -803            |
| 72          | March      | -1680           |
| 72          | April      | -2327           |
| 73          | January    | 513             |
| 74          | January    | 229             |
| 74          | March      | 318             |
| 75          | January    | 234             |
| 75          | February   | 294             |
| 76          | January    | 925             |
| 76          | February   | 2081            |
| 76          | March      | 435             |
| 77          | January    | 120             |
| 77          | February   | 501             |
| 77          | March      | 797             |
| 78          | January    | 694             |
| 78          | February   | -762            |
| 78          | March      | -717            |
| 78          | April      | -976            |
| 79          | January    | 521             |
| 79          | February   | 1380            |
| 80          | January    | 795             |
| 80          | February   | 1190            |
| 80          | March      | 622             |
| 80          | April      | 199             |
| 81          | January    | 403             |
| 81          | February   | -957            |
| 81          | March      | -1106           |
| 81          | April      | -1984           |
| 82          | January    | -3912           |
| 82          | February   | -3986           |
| 82          | March      | -3249           |
| 82          | April      | -4614           |
| 83          | January    | 1099            |
| 83          | February   | -692            |
| 83          | March      | -742            |
| 83          | April      | -377            |
| 84          | January    | 968             |
| 84          | March      | 609             |
| 85          | January    | 467             |
| 85          | March      | 1076            |
| 85          | April      | 646             |
| 86          | January    | 872             |
| 86          | February   | -504            |
| 86          | March      | 93              |
| 87          | January    | -365            |
| 87          | February   | -1366           |
| 87          | March      | -1563           |
| 87          | April      | -1195           |
| 88          | January    | -35             |
| 88          | February   | 752             |
| 88          | March      | -736            |
| 88          | April      | -820            |
| 89          | January    | 210             |
| 89          | February   | -1679           |
| 89          | March      | -2653           |
| 89          | April      | -3147           |
| 90          | January    | 1772            |
| 90          | February   | -1235           |
| 90          | March      | -1624           |
| 90          | April      | -1846           |
| 91          | January    | -47             |
| 91          | February   | -959            |
| 91          | March      | -2660           |
| 91          | April      | -2495           |
| 92          | January    | 985             |
| 92          | March      | 142             |
| 93          | January    | 399             |
| 93          | February   | 1103            |
| 93          | March      | 1186            |
| 93          | April      | 968             |
| 94          | January    | -766            |
| 94          | February   | -1496           |
| 94          | March      | -1542           |
| 95          | January    | 217             |
| 95          | February   | 960             |
| 95          | March      | 1446            |
| 96          | January    | 1048            |
| 96          | February   | 1537            |
| 96          | March      | 942             |
| 97          | January    | 623             |
| 97          | February   | -240            |
| 97          | March      | -2483           |
| 98          | January    | 622             |
| 98          | February   | 287             |
| 98          | March      | -95             |
| 98          | April      | 750             |
| 99          | January    | 949             |
| 99          | February   | 760             |
| 99          | March      | 737             |
| 100         | January    | 1081            |
| 100         | February   | -497            |
| 100         | March      | -1451           |
| 101         | January    | -484            |
| 101         | February   | -1324           |
| 101         | March      | -2673           |
| 102         | January    | 917             |
| 102         | February   | 1428            |
| 102         | March      | 1865            |
| 102         | April      | 646             |
| 103         | January    | 240             |
| 103         | February   | -850            |
| 103         | March      | -2257           |
| 104         | January    | 615             |
| 104         | February   | 1087            |
| 104         | March      | 1190            |
| 105         | January    | 1014            |
| 105         | February   | 166             |
| 105         | March      | 27              |
| 105         | April      | -186            |
| 106         | January    | -109            |
| 106         | February   | 846             |
| 106         | March      | -111            |
| 106         | April      | -1462           |
| 107         | January    | -144            |
| 107         | February   | -690            |
| 108         | January    | 530             |
| 108         | February   | 738             |
| 108         | March      | 1546            |
| 108         | April      | 2680            |
| 109         | January    | 429             |
| 109         | February   | 2491            |
| 110         | January    | 1258            |
| 110         | February   | 1198            |
| 110         | March      | 2233            |
| 111         | January    | 101             |
| 111         | February   | 463             |
| 111         | March      | 99              |
| 112         | January    | 945             |
| 112         | February   | 893             |
| 112         | March      | -116            |
| 113         | January    | -511            |
| 113         | February   | 62              |
| 113         | March      | 12              |
| 113         | April      | -1140           |
| 114         | January    | 743             |
| 114         | March      | 169             |
| 114         | April      | 1143            |
| 115         | January    | 144             |
| 115         | February   | -845            |
| 115         | March      | 884             |
| 115         | April      | -41             |
| 116         | January    | 167             |
| 116         | February   | 53              |
| 116         | March      | 543             |
| 116         | April      | 330             |
| 117         | January    | -25             |
| 117         | February   | -216            |
| 117         | March      | -706            |
| 118         | January    | -683            |
| 118         | February   | -513            |
| 118         | March      | -1427           |
| 119         | January    | 62              |
| 119         | March      | -907            |
| 119         | April      | -490            |
| 120         | January    | 824             |
| 120         | February   | 1913            |
| 120         | March      | -900            |
| 120         | April      | -1465           |
| 121         | January    | 1992            |
| 121         | February   | 1296            |
| 121         | March      | -425            |
| 122         | January    | 314             |
| 122         | February   | 252             |
| 122         | March      | 1347            |
| 122         | April      | 1066            |
| 123         | January    | -717            |
| 123         | February   | -2277           |
| 123         | March      | -1584           |
| 123         | April      | -2128           |
| 124         | January    | 731             |
| 124         | February   | 1878            |
| 124         | March      | 1301            |
| 125         | January    | -791            |
| 125         | February   | -2479           |
| 125         | March      | -2436           |
| 126         | January    | -786            |
| 126         | February   | -716            |
| 126         | March      | -2822           |
| 127         | January    | 217             |
| 127         | February   | 703             |
| 127         | April      | 1672            |
| 128         | January    | 410             |
| 128         | February   | 144             |
| 128         | March      | -776            |
| 128         | April      | -202            |
| 129         | January    | 466             |
| 129         | February   | -796            |
| 129         | March      | 68              |
| 129         | April      | -2007           |
| 130         | January    | -248            |
| 130         | February   | -1160           |
| 130         | March      | 132             |
| 131         | January    | 480             |
| 131         | February   | -983            |
| 131         | March      | -152            |
| 132         | January    | -1254           |
| 132         | February   | -2844           |
| 132         | March      | -5256           |
| 132         | April      | -5585           |
| 133         | January    | -356            |
| 133         | February   | -368            |
| 134         | January    | 3194            |
| 134         | February   | 2748            |
| 134         | March      | 1768            |
| 135         | January    | 104             |
| 135         | February   | 977             |
| 135         | March      | 1001            |
| 136         | January    | 479             |
| 136         | February   | 966             |
| 136         | March      | 383             |
| 136         | April      | -133            |
| 137         | January    | 396             |
| 137         | February   | -356            |
| 138         | January    | 1316            |
| 138         | February   | 320             |
| 138         | March      | 75              |
| 138         | April      | -775            |
| 139         | January    | 44              |
| 139         | February   | 504             |
| 139         | March      | 537             |
| 140         | January    | 803             |
| 140         | February   | 1526            |
| 140         | March      | 2345            |
| 140         | April      | 1495            |
| 141         | January    | -369            |
| 141         | February   | 1483            |
| 141         | March      | 2113            |
| 141         | April      | 2538            |
| 142         | January    | 1378            |
| 142         | February   | 440             |
| 142         | March      | 217             |
| 142         | April      | 863             |
| 143         | January    | 807             |
| 143         | February   | 1625            |
| 143         | March      | 26              |
| 143         | April      | -2457           |
| 144         | January    | -735            |
| 144         | February   | -3280           |
| 144         | March      | -3046           |
| 144         | April      | -4395           |
| 145         | January    | -3051           |
| 145         | February   | -1970           |
| 145         | March      | -4119           |
| 146         | January    | -807            |
| 146         | February   | -3267           |
| 146         | March      | -3781           |
| 146         | April      | -3717           |
| 147         | January    | 600             |
| 147         | February   | 1698            |
| 148         | January    | 88              |
| 148         | February   | -2467           |
| 148         | March      | -2076           |
| 148         | April      | -2730           |
| 149         | January    | 344             |
| 149         | February   | 321             |
| 149         | March      | -202            |
| 150         | January    | -600            |
| 150         | February   | -1512           |
| 150         | March      | -1604           |
| 150         | April      | -2429           |
| 151         | January    | 1367            |
| 151         | February   | 5               |
| 151         | March      | -887            |
| 152         | January    | 1831            |
| 152         | February   | 1902            |
| 152         | March      | 1984            |
| 153         | January    | -1954           |
| 153         | February   | -776            |
| 153         | March      | -1695           |
| 154         | January    | -1392           |
| 154         | February   | -2340           |
| 154         | March      | -2104           |
| 154         | April      | -2555           |
| 155         | January    | -996            |
| 155         | February   | -2941           |
| 155         | March      | -3377           |
| 155         | April      | -4530           |
| 156         | January    | 82              |
| 156         | April      | 312             |
| 157         | January    | 138             |
| 157         | February   | -611            |
| 157         | March      | 2766            |
| 158         | January    | 56              |
| 158         | February   | -136            |
| 158         | March      | -1106           |
| 159         | January    | -301            |
| 160         | January    | 843             |
| 160         | February   | 543             |
| 160         | March      | -69             |
| 160         | April      | -307            |
| 161         | January    | -1121           |
| 161         | February   | -961            |
| 161         | March      | -291            |
| 162         | January    | 123             |
| 162         | February   | 784             |
| 163         | January    | -73             |
| 163         | February   | -328            |
| 163         | March      | -3116           |
| 163         | April      | -3055           |
| 164         | January    | 548             |
| 164         | February   | 957             |
| 165         | January    | -61             |
| 165         | February   | -1088           |
| 165         | March      | -3701           |
| 165         | April      | -3931           |
| 166         | January    | 957             |
| 166         | February   | 1546            |
| 166         | March      | 1303            |
| 166         | April      | 1783            |
| 167         | January    | 51              |
| 167         | February   | 574             |
| 167         | March      | -566            |
| 167         | April      | -748            |
| 168         | January    | 114             |
| 168         | February   | -801            |
| 169         | January    | -569            |
| 169         | February   | -1190           |
| 169         | March      | 9               |
| 169         | April      | 906             |
| 170         | January    | -38             |
| 170         | February   | -373            |
| 170         | March      | -137            |
| 170         | April      | -850            |
| 171         | January    | -197            |
| 171         | February   | -1400           |
| 171         | March      | -1921           |
| 171         | April      | -911            |
| 172         | January    | -174            |
| 172         | March      | -1038           |
| 173         | January    | 1298            |
| 173         | February   | 1398            |
| 173         | March      | 912             |
| 173         | April      | 121             |
| 174         | January    | 1142            |
| 174         | February   | -98             |
| 174         | March      | -1135           |
| 174         | April      | 644             |
| 175         | January    | -326            |
| 175         | February   | -755            |
| 175         | March      | -1822           |
| 175         | April      | -1549           |
| 176         | January    | 655             |
| 176         | February   | 605             |
| 176         | March      | -531            |
| 176         | April      | -1067           |
| 177         | January    | 405             |
| 177         | February   | -156            |
| 177         | March      | 800             |
| 177         | April      | -974            |
| 178         | January    | 252             |
| 178         | February   | 387             |
| 178         | March      | 390             |
| 178         | April      | -1983           |
| 179         | January    | -1754           |
| 179         | February   | -3386           |
| 179         | March      | -7953           |
| 180         | January    | -838            |
| 180         | February   | -1808           |
| 180         | March      | -2804           |
| 180         | April      | -3175           |
| 181         | January    | -47             |
| 181         | February   | -843            |
| 181         | March      | -2640           |
| 182         | January    | 97              |
| 182         | February   | -45             |
| 182         | March      | -843            |
| 182         | April      | -159            |
| 183         | January    | -540            |
| 183         | February   | -3729           |
| 183         | March      | -6083           |
| 183         | April      | -6560           |
| 184         | January    | 472             |
| 184         | February   | -331            |
| 184         | March      | -2530           |
| 184         | April      | -3178           |
| 185         | January    | 626             |
| 185         | February   | -11             |
| 185         | March      | -1001           |
| 185         | April      | -505            |
| 186         | January    | 534             |
| 186         | February   | 1345            |
| 186         | March      | 1930            |
| 186         | April      | 1284            |
| 187         | January    | -211            |
| 187         | February   | -1379           |
| 187         | March      | -3060           |
| 187         | April      | -2272           |
| 188         | January    | -184            |
| 188         | February   | 1013            |
| 188         | March      | 52              |
| 188         | April      | -475            |
| 189         | January    | -838            |
| 189         | February   | -2101           |
| 189         | March      | -4007           |
| 190         | January    | 14              |
| 190         | February   | 459             |
| 190         | March      | 523             |
| 190         | April      | 1178            |
| 191         | January    | 1632            |
| 191         | February   | 1306            |
| 191         | March      | 1036            |
| 191         | April      | 879             |
| 192         | January    | 2526            |
| 192         | February   | -689            |
| 192         | March      | 383             |
| 192         | April      | 1139            |
| 193         | January    | 689             |
| 193         | March      | 486             |
| 194         | January    | 137             |
| 194         | February   | -2211           |
| 194         | March      | 178             |
| 194         | April      | -697            |
| 195         | January    | 489             |
| 195         | March      | 406             |
| 196         | January    | 734             |
| 196         | February   | 1295            |
| 196         | March      | 1382            |
| 197         | January    | -446            |
| 197         | February   | 137             |
| 197         | March      | 1023            |
| 197         | April      | 3685            |
| 198         | January    | 1144            |
| 198         | February   | 288             |
| 198         | March      | -1253           |
| 198         | April      | -757            |
| 199         | January    | 530             |
| 199         | February   | 515             |
| 199         | March      | -14             |
| 199         | April      | -220            |
| 200         | January    | 997             |
| 200         | February   | 1356            |
| 200         | March      | 2914            |
| 200         | April      | 2853            |
| 201         | January    | -383            |
| 201         | February   | -292            |
| 201         | March      | 1529            |
| 202         | January    | -530            |
| 202         | February   | -916            |
| 202         | March      | -2415           |
| 203         | January    | 2528            |
| 203         | February   | 3471            |
| 203         | March      | 3461            |
| 203         | April      | 3437            |
| 204         | January    | 749             |
| 204         | February   | 1039            |
| 204         | March      | 1587            |
| 204         | April      | 1893            |
| 205         | January    | -82             |
| 205         | February   | 1211            |
| 205         | March      | 1067            |
| 206         | January    | -215            |
| 206         | February   | -949            |
| 206         | March      | -4974           |
| 206         | April      | -5374           |
| 207         | January    | 322             |
| 207         | February   | -1954           |
| 207         | March      | -2152           |
| 207         | April      | -1014           |
| 208         | January    | 537             |
| 208         | February   | 406             |
| 208         | April      | 1361            |
| 209         | January    | -202            |
| 209         | February   | -766            |
| 209         | March      | -1266           |
| 209         | April      | -2351           |
| 210         | January    | 60              |
| 210         | February   | -1361           |
| 210         | March      | -1309           |
| 210         | April      | -792            |
| 211         | January    | 607             |
| 211         | February   | 1839            |
| 211         | March      | 257             |
| 211         | April      | -602            |
| 212         | January    | -336            |
| 212         | February   | 481             |
| 212         | March      | 3529            |
| 213         | January    | -239            |
| 213         | February   | -1199           |
| 213         | March      | -1184           |
| 213         | April      | -1717           |
| 214         | January    | -445            |
| 214         | February   | -1511           |
| 214         | March      | 83              |
| 214         | April      | 802             |
| 215         | January    | 822             |
| 215         | February   | 1770            |
| 215         | March      | 697             |
| 215         | April      | 414             |
| 216         | January    | 1619            |
| 216         | February   | 3302            |
| 216         | March      | 872             |
| 216         | April      | -110            |
| 217         | January    | 870             |
| 217         | February   | 1839            |
| 217         | March      | 9               |
| 218         | January    | 208             |
| 218         | February   | -1620           |
| 218         | March      | -465            |
| 218         | April      | 1167            |
| 219         | January    | 165             |
| 219         | February   | -845            |
| 219         | March      | 1108            |
| 219         | April      | 306             |
| 220         | January    | 307             |
| 220         | February   | 714             |
| 220         | March      | -29             |
| 220         | April      | -958            |
| 221         | January    | 1384            |
| 221         | February   | 1481            |
| 221         | March      | 1055            |
| 222         | January    | 657             |
| 222         | February   | 1997            |
| 222         | March      | 1136            |
| 222         | April      | 1532            |
| 223         | January    | 396             |
| 223         | February   | -1100           |
| 223         | March      | -1723           |
| 223         | April      | -2435           |
| 224         | January    | 487             |
| 224         | February   | -206            |
| 224         | March      | -1581           |
| 224         | April      | -1369           |
| 225         | January    | 280             |
| 225         | February   | -89             |
| 225         | March      | 297             |
| 226         | January    | -980            |
| 226         | February   | -586            |
| 226         | March      | -1855           |
| 226         | April      | -1430           |
| 227         | January    | -622            |
| 227         | February   | -1045           |
| 227         | March      | -2336           |
| 227         | April      | -3161           |
| 228         | January    | 294             |
| 228         | February   | -253            |
| 228         | March      | -1724           |
| 229         | January    | 621             |
| 229         | February   | 1618            |
| 229         | March      | 703             |
| 230         | January    | 499             |
| 230         | February   | 990             |
| 230         | March      | 2428            |
| 230         | April      | 2356            |
| 231         | January    | -236            |
| 231         | February   | -534            |
| 231         | March      | -2010           |
| 231         | April      | -2475           |
| 232         | January    | 1418            |
| 232         | February   | 864             |
| 232         | March      | 923             |
| 233         | January    | 1795            |
| 233         | February   | 2910            |
| 233         | March      | 3742            |
| 234         | January    | -200            |
| 234         | February   | 322             |
| 234         | March      | -2276           |
| 235         | January    | -1963           |
| 235         | February   | -476            |
| 235         | March      | 24              |
| 236         | January    | 356             |
| 236         | February   | 1059            |
| 236         | March      | 924             |
| 236         | April      | -100            |
| 237         | January    | -174            |
| 237         | February   | 136             |
| 237         | March      | 1567            |
| 237         | April      | 812             |
| 238         | January    | 802             |
| 238         | February   | 1270            |
| 238         | April      | -479            |
| 239         | January    | -10             |
| 239         | February   | 706             |
| 239         | March      | 574             |
| 239         | April      | 1871            |
| 240         | January    | 1108            |
| 240         | February   | 754             |
| 240         | March      | 3200            |
| 240         | April      | 3075            |
| 241         | January    | 20              |
| 242         | January    | 1143            |
| 242         | February   | -462            |
| 242         | March      | -1891           |
| 242         | April      | -3334           |
| 243         | January    | -368            |
| 243         | March      | 979             |
| 244         | January    | 728             |
| 244         | February   | 1752            |
| 244         | March      | 1930            |
| 244         | April      | 877             |
| 245         | January    | 76              |
| 245         | February   | -341            |
| 245         | March      | -1791           |
| 245         | April      | -1021           |
| 246         | January    | 506             |
| 246         | February   | 584             |
| 246         | March      | 277             |
| 246         | April      | -2132           |
| 247         | January    | 983             |
| 247         | February   | 577             |
| 247         | March      | 297             |
| 248         | January    | 304             |
| 248         | February   | 667             |
| 248         | March      | 955             |
| 248         | April      | 1188            |
| 249         | January    | 336             |
| 249         | March      | 1065            |
| 249         | April      | 895             |
| 250         | January    | 149             |
| 250         | February   | 0               |
| 250         | March      | 177             |
| 250         | April      | -1555           |
| 251         | January    | 1276            |
| 251         | February   | -924            |
| 251         | March      | -1230           |
| 251         | April      | -1883           |
| 252         | January    | 289             |
| 252         | April      | 133             |
| 253         | January    | -578            |
| 253         | February   | -577            |
| 253         | March      | -457            |
| 253         | April      | -484            |
| 254         | January    | 36              |
| 254         | February   | -2883           |
| 254         | March      | -590            |
| 255         | January    | 253             |
| 255         | February   | 129             |
| 255         | March      | -548            |
| 256         | January    | 1743            |
| 256         | February   | 906             |
| 256         | March      | 1152            |
| 256         | April      | 1094            |
| 257         | January    | 414             |
| 257         | February   | -1609           |
| 257         | March      | -472            |
| 257         | April      | -976            |
| 258         | January    | 590             |
| 258         | February   | -1076           |
| 258         | March      | -2893           |
| 258         | April      | -1465           |
| 259         | January    | 928             |
| 259         | February   | -267            |
| 259         | March      | -1458           |
| 260         | January    | 1865            |
| 260         | March      | 1909            |
| 261         | January    | 746             |
| 261         | February   | 1408            |
| 261         | March      | -329            |
| 261         | April      | -31             |
| 262         | January    | -1070           |
| 262         | February   | -2599           |
| 262         | March      | -2372           |
| 263         | January    | 312             |
| 263         | February   | 112             |
| 263         | April      | 770             |
| 264         | January    | 770             |
| 264         | February   | 1545            |
| 264         | March      | 2088            |
| 264         | April      | 1295            |
| 265         | January    | -25             |
| 265         | February   | -1481           |
| 265         | March      | -2592           |
| 265         | April      | -1948           |
| 266         | January    | 651             |
| 266         | February   | 1455            |
| 266         | March      | 787             |
| 266         | April      | 1138            |
| 267         | January    | -193            |
| 267         | February   | -2068           |
| 267         | March      | -5236           |
| 267         | April      | -2442           |
| 268         | January    | 1699            |
| 268         | February   | 123             |
| 268         | March      | 270             |
| 268         | April      | -218            |
| 269         | January    | -2665           |
| 269         | February   | -3985           |
| 269         | March      | -2470           |
| 269         | April      | -1864           |
| 270         | January    | 1395            |
| 270         | February   | 961             |
| 270         | March      | 599             |
| 270         | April      | -442            |
| 271         | January    | -1586           |
| 271         | February   | 272             |
| 271         | March      | -616            |
| 271         | April      | 180             |
| 272         | January    | -228            |
| 272         | February   | -1673           |
| 272         | April      | -1769           |
| 273         | January    | 876             |
| 273         | February   | 133             |
| 273         | March      | -178            |
| 273         | April      | 308             |
| 274         | January    | -780            |
| 274         | February   | -582            |
| 274         | March      | 124             |
| 275         | January    | 211             |
| 275         | February   | -1325           |
| 275         | March      | -2973           |
| 275         | April      | -3169           |
| 276         | January    | -851            |
| 276         | February   | -796            |
| 276         | March      | -1944           |
| 277         | January    | 615             |
| 277         | February   | 1411            |
| 277         | March      | 1865            |
| 278         | January    | 1309            |
| 278         | February   | 1723            |
| 278         | March      | 2026            |
| 278         | April      | 3554            |
| 279         | January    | 1895            |
| 279         | February   | 3641            |
| 279         | March      | 4183            |
| 279         | April      | 4103            |
| 280         | January    | -87             |
| 280         | February   | -185            |
| 280         | March      | -373            |
| 281         | January    | 220             |
| 281         | February   | 1055            |
| 281         | March      | 2192            |
| 281         | April      | 3004            |
| 282         | January    | 74              |
| 282         | February   | -713            |
| 282         | March      | -1661           |
| 282         | April      | -1311           |
| 283         | January    | -1201           |
| 283         | February   | -2818           |
| 283         | March      | -5721           |
| 283         | April      | -7145           |
| 284         | January    | 257             |
| 284         | February   | -2602           |
| 284         | March      | -2826           |
| 284         | April      | -3379           |
| 285         | January    | 360             |
| 285         | February   | 1358            |
| 285         | March      | 1965            |
| 286         | January    | 177             |
| 286         | February   | 171             |
| 287         | January    | 658             |
| 287         | February   | 829             |
| 287         | March      | 886             |
| 287         | April      | -406            |
| 288         | January    | 778             |
| 288         | February   | -867            |
| 288         | March      | -515            |
| 289         | January    | 838             |
| 289         | February   | -207            |
| 289         | March      | -934            |
| 289         | April      | -1059           |
| 290         | January    | 785             |
| 290         | February   | 1139            |
| 290         | March      | 2061            |
| 290         | April      | 21              |
| 291         | January    | 930             |
| 291         | April      | 531             |
| 292         | January    | -3458           |
| 292         | February   | -4646           |
| 292         | March      | -4760           |
| 293         | January    | -383            |
| 293         | February   | -1452           |
| 293         | March      | -1770           |
| 293         | April      | -2500           |
| 294         | January    | 307             |
| 294         | February   | 1557            |
| 294         | March      | 707             |
| 295         | January    | 636             |
| 295         | February   | 496             |
| 295         | March      | 1430            |
| 295         | April      | -177            |
| 296         | January    | 191             |
| 296         | February   | 1152            |
| 296         | March      | 1309            |
| 296         | April      | 2220            |
| 297         | January    | 550             |
| 297         | February   | 585             |
| 297         | March      | 1004            |
| 297         | April      | 1282            |
| 298         | January    | 278             |
| 298         | February   | -580            |
| 298         | March      | 767             |
| 298         | April      | 1489            |
| 299         | January    | 961             |
| 299         | February   | 1246            |
| 299         | March      | 70              |
| 300         | January    | 672             |
| 300         | February   | -949            |
| 300         | March      | -2374           |
| 300         | April      | -3179           |
| 301         | January    | -906            |
| 301         | February   | -1977           |
| 301         | March      | -3636           |
| 301         | April      | -3529           |
| 302         | January    | -1499           |
| 302         | February   | -2077           |
| 302         | March      | -2410           |
| 302         | April      | -1795           |
| 303         | January    | 332             |
| 303         | February   | 465             |
| 303         | March      | -629            |
| 303         | April      | -660            |
| 304         | January    | 152             |
| 304         | February   | -1360           |
| 304         | March      | -2420           |
| 304         | April      | -2047           |
| 305         | January    | 20              |
| 305         | February   | 189             |
| 305         | March      | -56             |
| 306         | January    | 402             |
| 306         | March      | 0               |
| 306         | April      | 1565            |
| 307         | January    | -696            |
| 307         | February   | 750             |
| 307         | March      | 525             |
| 307         | April      | 62              |
| 308         | January    | -561            |
| 308         | February   | 316             |
| 308         | March      | 710             |
| 308         | April      | 971             |
| 309         | January    | -363            |
| 309         | February   | -2404           |
| 309         | March      | -1813           |
| 309         | April      | -960            |
| 310         | January    | 860             |
| 310         | February   | 156             |
| 310         | March      | 3066            |
| 311         | January    | 310             |
| 311         | February   | 1006            |
| 311         | March      | -955            |
| 311         | April      | -1055           |
| 312         | January    | 485             |
| 312         | February   | 656             |
| 312         | March      | -1065           |
| 312         | April      | -2318           |
| 313         | January    | 901             |
| 313         | February   | 972             |
| 313         | March      | -1311           |
| 313         | April      | -34             |
| 314         | January    | 448             |
| 314         | February   | -633            |
| 314         | March      | 91              |
| 314         | April      | -249            |
| 315         | January    | 1295            |
| 315         | February   | 1349            |
| 315         | March      | 2287            |
| 316         | January    | 184             |
| 316         | February   | -2483           |
| 316         | March      | -3299           |
| 317         | January    | 869             |
| 317         | February   | 1232            |
| 317         | April      | 995             |
| 318         | January    | 321             |
| 318         | February   | -342            |
| 318         | March      | -1648           |
| 319         | January    | 83              |
| 319         | February   | -703            |
| 319         | March      | -488            |
| 320         | January    | 2426            |
| 320         | February   | 1909            |
| 320         | March      | 2239            |
| 320         | April      | 2851            |
| 321         | January    | 243             |
| 321         | February   | -213            |
| 321         | April      | 572             |
| 322         | January    | 1949            |
| 322         | February   | 2471            |
| 322         | March      | 1811            |
| 323         | January    | 1323            |
| 323         | February   | -1880           |
| 323         | March      | -4196           |
| 323         | April      | -5221           |
| 324         | January    | 203             |
| 324         | February   | 967             |
| 324         | March      | 1470            |
| 325         | January    | 60              |
| 325         | February   | -1878           |
| 325         | March      | -1862           |
| 326         | January    | -211            |
| 326         | February   | 417             |
| 327         | January    | 919             |
| 327         | March      | -164            |
| 328         | January    | -1232           |
| 328         | February   | -3426           |
| 328         | March      | -4703           |
| 328         | April      | -4559           |
| 329         | January    | 831             |
| 329         | February   | 2               |
| 329         | March      | -626            |
| 329         | April      | 736             |
| 330         | January    | 826             |
| 330         | February   | 1099            |
| 330         | March      | -666            |
| 330         | April      | -1474           |
| 331         | January    | -54             |
| 331         | February   | -173            |
| 331         | March      | -949            |
| 332         | January    | 202             |
| 332         | February   | 559             |
| 332         | March      | 494             |
| 332         | April      | 670             |
| 333         | January    | -229            |
| 333         | February   | -127            |
| 333         | March      | 567             |
| 333         | April      | 920             |
| 334         | January    | 1177            |
| 334         | February   | 2724            |
| 334         | March      | 2425            |
| 334         | April      | 1614            |
| 335         | January    | 570             |
| 335         | February   | -354            |
| 335         | March      | 423             |
| 336         | January    | 543             |
| 336         | February   | -595            |
| 336         | March      | 135             |
| 336         | April      | 599             |
| 337         | January    | -264            |
| 337         | February   | 170             |
| 337         | March      | 1450            |
| 337         | April      | 1314            |
| 338         | January    | 262             |
| 338         | February   | 533             |
| 338         | March      | 2767            |
| 338         | April      | 1264            |
| 339         | January    | -780            |
| 339         | February   | 1088            |
| 339         | March      | 625             |
| 340         | January    | -1086           |
| 340         | February   | 276             |
| 340         | March      | 559             |
| 340         | April      | 1390            |
| 341         | January    | 345             |
| 341         | February   | -873            |
| 341         | March      | -2133           |
| 341         | April      | -2094           |
| 342         | January    | 347             |
| 342         | February   | -285            |
| 342         | March      | 503             |
| 342         | April      | -135            |
| 343         | January    | 1339            |
| 343         | February   | 1653            |
| 343         | March      | 1841            |
| 344         | January    | -932            |
| 344         | February   | 505             |
| 344         | March      | 1475            |
| 345         | January    | -100            |
| 345         | February   | -650            |
| 345         | March      | -2288           |
| 346         | January    | 916             |
| 346         | February   | -1052           |
| 346         | April      | -3802           |
| 347         | January    | 394             |
| 347         | February   | -775            |
| 347         | March      | -1768           |
| 348         | January    | -771            |
| 348         | February   | 114             |
| 348         | March      | -155            |
| 348         | April      | 48              |
| 349         | January    | -844            |
| 349         | February   | -1040           |
| 349         | March      | 1309            |
| 349         | April      | 1964            |
| 350         | January    | 2200            |
| 350         | February   | 1080            |
| 350         | March      | -174            |
| 350         | April      | -1233           |
| 351         | January    | 90              |
| 351         | February   | -1533           |
| 351         | March      | -1860           |
| 352         | January    | 416             |
| 352         | February   | -1612           |
| 352         | March      | -1774           |
| 352         | April      | -2269           |
| 353         | January    | -555            |
| 353         | February   | -1819           |
| 353         | March      | -516            |
| 354         | January    | 822             |
| 354         | March      | 158             |
| 355         | January    | -245            |
| 355         | February   | -194            |
| 355         | March      | -1137           |
| 355         | April      | -852            |
| 356         | January    | -1870           |
| 356         | February   | -3929           |
| 356         | March      | -6518           |
| 356         | April      | -6882           |
| 357         | January    | 780             |
| 357         | February   | 878             |
| 357         | March      | 496             |
| 357         | April      | -188            |
| 358         | January    | -1062           |
| 358         | February   | -619            |
| 358         | March      | -883            |
| 358         | April      | -708            |
| 359         | January    | 890             |
| 359         | February   | 1284            |
| 359         | March      | 3159            |
| 359         | April      | 2878            |
| 360         | January    | -1306           |
| 360         | February   | -427            |
| 360         | March      | -1255           |
| 360         | April      | -324            |
| 361         | January    | 340             |
| 361         | February   | 772             |
| 362         | January    | 416             |
| 362         | February   | 481             |
| 362         | March      | -564            |
| 362         | April      | 615             |
| 363         | January    | 977             |
| 363         | February   | -618            |
| 363         | March      | -3065           |
| 363         | April      | -2886           |
| 364         | January    | -57             |
| 364         | February   | -456            |
| 364         | March      | 1173            |
| 364         | April      | 811             |
| 365         | January    | -68             |
| 365         | February   | 244             |
| 365         | March      | -75             |
| 365         | April      | -760            |
| 366         | January    | -51             |
| 366         | February   | -93             |
| 366         | March      | -1305           |
| 366         | April      | -1096           |
| 367         | January    | 239             |
| 367         | February   | -467            |
| 367         | March      | -3101           |
| 367         | April      | -1697           |
| 368         | January    | -526            |
| 368         | February   | -3490           |
| 368         | March      | -1476           |
| 368         | April      | -2860           |
| 369         | January    | 266             |
| 369         | March      | 1679            |
| 370         | January    | -2295           |
| 370         | February   | -1635           |
| 370         | March      | -1311           |
| 370         | April      | -1496           |
| 371         | January    | -134            |
| 371         | February   | -154            |
| 371         | March      | -5              |
| 371         | April      | -1243           |
| 372         | January    | 2718            |
| 372         | February   | 1241            |
| 372         | March      | -1625           |
| 373         | January    | 493             |
| 373         | February   | 277             |
| 373         | March      | 1057            |
| 373         | April      | 1451            |
| 374         | January    | -457            |
| 374         | February   | -1292           |
| 374         | March      | -846            |
| 375         | January    | 647             |
| 375         | February   | 328             |
| 375         | March      | -440            |
| 375         | April      | -1291           |
| 376         | January    | 1614            |
| 376         | February   | 2515            |
| 376         | March      | 3062            |
| 377         | January    | 252             |
| 377         | February   | -182            |
| 377         | April      | -785            |
| 378         | January    | 484             |
| 378         | February   | 2424            |
| 378         | March      | 1590            |
| 379         | January    | -35             |
| 379         | February   | -268            |
| 379         | April      | -1206           |
| 380         | January    | -849            |
| 380         | February   | -1481           |
| 380         | March      | -3662           |
| 381         | January    | 66              |
| 381         | February   | 992             |
| 381         | March      | 278             |
| 381         | April      | -597            |
| 382         | January    | -687            |
| 382         | February   | -1195           |
| 382         | March      | -1141           |
| 383         | January    | -36             |
| 383         | February   | 935             |
| 383         | March      | -617            |
| 383         | April      | 913             |
| 384         | January    | -10             |
| 384         | February   | -2486           |
| 384         | March      | -2527           |
| 385         | January    | -1174           |
| 385         | March      | -4693           |
| 385         | April      | -4861           |
| 386         | January    | 1108            |
| 386         | February   | 759             |
| 386         | March      | -766            |
| 386         | April      | -3837           |
| 387         | January    | 1069            |
| 387         | March      | 2551            |
| 387         | April      | 2454            |
| 388         | January    | 2243            |
| 388         | February   | 1126            |
| 388         | March      | 1598            |
| 388         | April      | 1376            |
| 389         | January    | -27             |
| 389         | February   | 490             |
| 389         | March      | 1214            |
| 389         | April      | 2005            |
| 390         | January    | -705            |
| 390         | February   | -2038           |
| 390         | March      | -1929           |
| 390         | April      | -2801           |
| 391         | January    | 603             |
| 391         | February   | 2               |
| 391         | March      | 272             |
| 391         | April      | -90             |
| 392         | January    | 816             |
| 392         | February   | 2034            |
| 392         | March      | 1498            |
| 392         | April      | 1253            |
| 393         | January    | 659             |
| 393         | February   | 118             |
| 393         | March      | 1500            |
| 393         | April      | 639             |
| 394         | January    | 3268            |
| 394         | February   | 2644            |
| 394         | March      | 1420            |
| 395         | January    | -1782           |
| 395         | February   | -914            |
| 395         | March      | -903            |
| 395         | April      | -1723           |
| 396         | January    | -909            |
| 396         | February   | -550            |
| 396         | March      | -2848           |
| 397         | January    | 973             |
| 397         | February   | 1106            |
| 397         | March      | 1709            |
| 398         | January    | -429            |
| 398         | February   | -3171           |
| 398         | March      | -3401           |
| 399         | January    | 593             |
| 399         | February   | -301            |
| 399         | March      | -1488           |
| 399         | April      | -1717           |
| 400         | January    | 155             |
| 400         | February   | -409            |
| 400         | April      | 1338            |
| 401         | January    | 102             |
| 401         | February   | -25             |
| 401         | March      | 83              |
| 402         | January    | 1478            |
| 402         | February   | 1599            |
| 402         | March      | 796             |
| 403         | January    | 303             |
| 403         | March      | 987             |
| 403         | April      | 1047            |
| 404         | January    | -245            |
| 404         | February   | -347            |
| 404         | March      | -2484           |
| 405         | January    | -2897           |
| 405         | February   | -4125           |
| 405         | March      | -6882           |
| 405         | April      | -7070           |
| 406         | January    | 795             |
| 406         | February   | 1131            |
| 406         | March      | 2597            |
| 406         | April      | 2279            |
| 407         | January    | 7               |
| 407         | February   | 46              |
| 407         | March      | -900            |
| 407         | April      | -3275           |
| 408         | January    | -145            |
| 408         | March      | 800             |
| 408         | April      | -132            |
| 409         | January    | 155             |
| 409         | February   | 1371            |
| 409         | March      | 2455            |
| 409         | April      | 2623            |
| 410         | January    | 1025            |
| 410         | February   | 199             |
| 410         | March      | -52             |
| 411         | January    | 551             |
| 411         | April      | -981            |
| 412         | January    | 722             |
| 412         | February   | 608             |
| 413         | January    | 642             |
| 413         | February   | 1072            |
| 413         | April      | 801             |
| 414         | January    | 439             |
| 414         | March      | 1918            |
| 415         | January    | 331             |
| 415         | February   | -586            |
| 415         | March      | -4287           |
| 416         | January    | 756             |
| 416         | February   | 1715            |
| 416         | March      | 3324            |
| 416         | April      | 3898            |
| 417         | January    | 707             |
| 417         | February   | -1079           |
| 417         | March      | -1540           |
| 417         | April      | -1847           |
| 418         | January    | -499            |
| 418         | February   | -996            |
| 418         | March      | -1624           |
| 418         | April      | -1828           |
| 419         | January    | 1193            |
| 419         | February   | 123             |
| 419         | March      | -1280           |
| 420         | January    | -280            |
| 420         | February   | -2117           |
| 420         | March      | -2457           |
| 420         | April      | -2078           |
| 421         | January    | -741            |
| 421         | February   | -571            |
| 421         | March      | -413            |
| 421         | April      | 312             |
| 422         | January    | 356             |
| 422         | February   | -1661           |
| 422         | March      | -1046           |
| 422         | April      | -3357           |
| 423         | January    | 361             |
| 423         | February   | -262            |
| 423         | March      | 1321            |
| 424         | January    | -595            |
| 424         | February   | -648            |
| 424         | March      | -940            |
| 424         | April      | -314            |
| 425         | January    | 63              |
| 425         | February   | -505            |
| 425         | March      | 57              |
| 425         | April      | -721            |
| 426         | January    | -880            |
| 426         | February   | -3802           |
| 426         | March      | -4352           |
| 426         | April      | -5352           |
| 427         | January    | 588             |
| 427         | February   | 1305            |
| 427         | March      | 676             |
| 427         | April      | -316            |
| 428         | January    | 280             |
| 428         | February   | 687             |
| 428         | March      | 1217            |
| 429         | January    | 82              |
| 429         | February   | 473             |
| 429         | March      | -46             |
| 429         | April      | -901            |
| 430         | January    | -8              |
| 430         | February   | 403             |
| 430         | March      | -1326           |
| 431         | January    | -400            |
| 431         | February   | -1139           |
| 432         | January    | 392             |
| 432         | February   | 986             |
| 432         | March      | 963             |
| 432         | April      | 2435            |
| 433         | January    | 883             |
| 433         | February   | 1286            |
| 433         | March      | 660             |
| 434         | January    | 1123            |
| 434         | February   | -117            |
| 434         | March      | -2366           |
| 434         | April      | -1815           |
| 435         | January    | -1329           |
| 435         | February   | -38             |
| 435         | March      | -1176           |
| 436         | January    | 917             |
| 436         | February   | 886             |
| 436         | March      | -676            |
| 437         | January    | -361            |
| 437         | February   | -1537           |
| 437         | March      | -1318           |
| 437         | April      | -1134           |
| 438         | January    | 1317            |
| 438         | February   | 2813            |
| 438         | March      | 1423            |
| 439         | January    | 430             |
| 439         | March      | -381            |
| 439         | April      | 318             |
| 440         | January    | -123            |
| 440         | February   | 146             |
| 440         | March      | 490             |
| 441         | January    | -329            |
| 441         | February   | 745             |
| 441         | March      | -669            |
| 441         | April      | -798            |
| 442         | January    | 142             |
| 442         | February   | -2898           |
| 442         | March      | -4520           |
| 442         | April      | -5499           |
| 443         | January    | 760             |
| 443         | February   | 710             |
| 443         | March      | -359            |
| 443         | April      | -11             |
| 444         | January    | 83              |
| 444         | February   | -1178           |
| 444         | March      | -499            |
| 444         | April      | -820            |
| 445         | January    | 1364            |
| 445         | February   | 894             |
| 445         | March      | 724             |
| 445         | April      | 312             |
| 446         | January    | 412             |
| 446         | March      | -53             |
| 446         | April      | 405             |
| 447         | January    | 1195            |
| 447         | February   | 41              |
| 447         | March      | -1290           |
| 448         | January    | 1360            |
| 448         | February   | -909            |
| 448         | March      | -2042           |
| 448         | April      | -2418           |
| 449         | January    | -3100           |
| 449         | February   | -3928           |
| 449         | March      | -3045           |
| 450         | January    | 469             |
| 450         | February   | -159            |
| 450         | March      | -737            |
| 450         | April      | -36             |
| 451         | January    | 910             |
| 451         | February   | -1313           |
| 451         | March      | -645            |
| 451         | April      | -756            |
| 452         | January    | 1360            |
| 452         | February   | 1654            |
| 452         | March      | 1613            |
| 453         | January    | 638             |
| 453         | February   | 811             |
| 453         | March      | -595            |
| 453         | April      | 117             |
| 454         | January    | 11              |
| 454         | February   | 2163            |
| 454         | March      | 2101            |
| 455         | January    | 329             |
| 455         | March      | -231            |
| 456         | January    | 1314            |
| 456         | February   | 744             |
| 456         | March      | -55             |
| 456         | April      | 12              |
| 457         | January    | 195             |
| 457         | February   | -234            |
| 457         | March      | -714            |
| 457         | April      | -718            |
| 458         | January    | 715             |
| 458         | February   | -653            |
| 459         | January    | 246             |
| 459         | February   | -2912           |
| 459         | March      | -2834           |
| 460         | January    | 80              |
| 460         | February   | -1158           |
| 460         | March      | -1175           |
| 460         | April      | -327            |
| 461         | January    | 2267            |
| 461         | February   | 3431            |
| 461         | March      | 3212            |
| 462         | January    | 907             |
| 462         | February   | -10             |
| 462         | March      | -831            |
| 462         | April      | -1395           |
| 463         | January    | 1166            |
| 463         | February   | 312             |
| 463         | March      | 673             |
| 463         | April      | 280             |
| 464         | January    | 953             |
| 464         | March      | -511            |
| 464         | April      | -1494           |
| 465         | January    | 955             |
| 465         | February   | 1989            |
| 465         | March      | 1506            |
| 465         | April      | 1350            |
| 466         | January    | 80              |
| 466         | February   | -1979           |
| 466         | March      | -2113           |
| 467         | January    | 1994            |
| 467         | February   | 3582            |
| 467         | March      | 2754            |
| 467         | April      | 1190            |
| 468         | January    | 39              |
| 468         | February   | -155            |
| 468         | March      | -917            |
| 469         | January    | 386             |
| 469         | February   | 2161            |
| 469         | March      | -802            |
| 469         | April      | -1537           |
| 470         | January    | 377             |
| 470         | February   | -311            |
| 471         | January    | 781             |
| 471         | March      | 1238            |
| 471         | April      | 1887            |
| 472         | January    | 811             |
| 472         | February   | -115            |
| 472         | March      | 32              |
| 472         | April      | 218             |
| 473         | January    | -183            |
| 473         | February   | -864            |
| 473         | March      | -3630           |
| 473         | April      | -5772           |
| 474         | January    | 928             |
| 474         | February   | 139             |
| 474         | March      | -259            |
| 475         | January    | -673            |
| 475         | February   | -1966           |
| 475         | March      | -5073           |
| 476         | January    | -476            |
| 476         | February   | -2003           |
| 476         | March      | -3365           |
| 476         | April      | -4972           |
| 477         | January    | -3034           |
| 477         | February   | -4592           |
| 477         | March      | -6538           |
| 478         | January    | -712            |
| 478         | February   | 2278            |
| 478         | March      | 2087            |
| 479         | January    | 320             |
| 479         | February   | -327            |
| 479         | March      | 513             |
| 480         | January    | 522             |
| 480         | March      | -235            |
| 480         | April      | -165            |
| 481         | January    | -1396           |
| 481         | February   | -2905           |
| 481         | March      | -3394           |
| 482         | January    | 386             |
| 482         | February   | -687            |
| 482         | March      | -1256           |
| 483         | January    | 2038            |
| 483         | March      | -189            |
| 483         | April      | 1330            |
| 484         | January    | 871             |
| 484         | March      | 1796            |
| 485         | January    | 16              |
| 485         | February   | 1507            |
| 485         | March      | 2202            |
| 486         | January    | -1632           |
| 486         | February   | -2250           |
| 486         | March      | -3108           |
| 487         | January    | -572            |
| 487         | February   | 312             |
| 487         | March      | 162             |
| 487         | April      | -330            |
| 488         | January    | -243            |
| 488         | February   | 297             |
| 488         | March      | -412            |
| 488         | April      | -191            |
| 489         | January    | 556             |
| 489         | February   | 1808            |
| 489         | March      | 3342            |
| 489         | April      | 5338            |
| 490         | January    | 271             |
| 490         | February   | 342             |
| 490         | April      | 24              |
| 491         | January    | -3              |
| 491         | February   | 298             |
| 491         | March      | -2319           |
| 492         | January    | -738            |
| 492         | February   | -1399           |
| 492         | March      | -2133           |
| 493         | January    | 845             |
| 493         | February   | -824            |
| 493         | April      | -738            |
| 494         | January    | 529             |
| 494         | February   | 909             |
| 494         | March      | 1447            |
| 495         | January    | -286            |
| 495         | February   | -1438           |
| 495         | March      | -89             |
| 496         | January    | 47              |
| 496         | February   | -3076           |
| 496         | March      | -2426           |
| 497         | January    | 754             |
| 497         | February   | 1003            |
| 497         | March      | 1739            |
| 497         | April      | 2680            |
| 498         | January    | 1360            |
| 498         | February   | 2195            |
| 498         | March      | 2989            |
| 498         | April      | 3488            |
| 499         | January    | -304            |
| 499         | February   | 1415            |
| 499         | March      | 599             |
| 500         | January    | 1594            |
| 500         | February   | 2981            |
| 500         | March      | 2251            |

---
**Query #5** What is the percentage of customers who increase their closing balance by more than 5%?

    WITH txn_cte AS
    (SELECT customer_id, EXTRACT(MONTH FROM txn_date) as month_num, TO_CHAR(txn_date, 'Month') as month_name,
     SUM(CASE
         	WHEN txn_type = 'deposit' THEN txn_amount
         	ELSE 0
        END) as deposit_amt,
     SUM(CASE
         	WHEN txn_type = 'purchase' THEN txn_amount
         	ELSE 0
        END) as purchase_amt,
     SUM(CASE
         	WHEN txn_type = 'withdrawal' THEN txn_amount
         	ELSE 0
        END) as withdrawal_amt
    FROM data_bank.customer_transactions
    GROUP BY customer_id, month_num, month_name
    ORDER BY customer_id, month_num), 
    
    closing_balance_cte AS
    (SELECT customer_id, month_num, month_name, SUM(deposit_amt - purchase_amt - withdrawal_amt) OVER(PARTITION BY customer_id ORDER BY month_num) AS closing_balance
    FROM txn_cte
    ORDER BY customer_id, month_num),
    
    prev_balance_cte AS
    (SELECT *, LAG(closing_balance::INTEGER, 1, 0) OVER(PARTITION BY customer_id ORDER BY month_num) as prev_balance
    FROM closing_balance_cte)
    
    SELECT ROUND(100.0*COUNT(DISTINCT(customer_id)) / (SELECT COUNT(DISTINCT ct.customer_id) FROM data_bank.customer_transactions ct),1) as percentage  
    FROM prev_balance_cte
    WHERE prev_balance <> 0 AND
    closing_balance > 1.05 * prev_balance;

| percentage |
| ---------- |
| 70.6       |

---
<p align=center><b>C. Data Allocation Challenge</b>

---
**Query #1** running customer balance column that includes the impact each transaction

    SELECT *, SUM(
    CASE
      WHEN txn_type = 'purchase' OR txn_type = 'withdraw' THEN  -1 * txn_amount
      ELSE txn_amount
    END)
    OVER(PARTITION BY customer_id ORDER BY txn_date) AS running_customer_balance 
    FROM data_bank.customer_transactions;

| customer_id | txn_date                 | txn_type   | txn_amount | running_customer_balance |
| ----------- | ------------------------ | ---------- | ---------- | ------------------------ |
| 1           | 2020-01-02T00:00:00.000Z | deposit    | 312        | 312                      |
| 1           | 2020-03-05T00:00:00.000Z | purchase   | 612        | -300                     |
| 1           | 2020-03-17T00:00:00.000Z | deposit    | 324        | 24                       |
| 1           | 2020-03-19T00:00:00.000Z | purchase   | 664        | -640                     |
| 2           | 2020-01-03T00:00:00.000Z | deposit    | 549        | 549                      |
| 2           | 2020-03-24T00:00:00.000Z | deposit    | 61         | 610                      |
| 3           | 2020-01-27T00:00:00.000Z | deposit    | 144        | 144                      |
| 3           | 2020-02-22T00:00:00.000Z | purchase   | 965        | -821                     |
| 3           | 2020-03-05T00:00:00.000Z | withdrawal | 213        | -608                     |
| 3           | 2020-03-19T00:00:00.000Z | withdrawal | 188        | -420                     |
| 3           | 2020-04-12T00:00:00.000Z | deposit    | 493        | 73                       |
| 4           | 2020-01-07T00:00:00.000Z | deposit    | 458        | 458                      |
| 4           | 2020-01-21T00:00:00.000Z | deposit    | 390        | 848                      |
| 4           | 2020-03-25T00:00:00.000Z | purchase   | 193        | 655                      |
| 5           | 2020-01-15T00:00:00.000Z | deposit    | 974        | 974                      |
| 5           | 2020-01-25T00:00:00.000Z | deposit    | 806        | 1780                     |
| 5           | 2020-01-31T00:00:00.000Z | withdrawal | 826        | 2606                     |
| 5           | 2020-03-02T00:00:00.000Z | purchase   | 886        | 1720                     |
| 5           | 2020-03-19T00:00:00.000Z | deposit    | 718        | 2438                     |
| 5           | 2020-03-26T00:00:00.000Z | withdrawal | 786        | 3224                     |
| 5           | 2020-03-27T00:00:00.000Z | withdrawal | 700        | 4336                     |
| 5           | 2020-03-27T00:00:00.000Z | deposit    | 412        | 4336                     |
| 5           | 2020-03-29T00:00:00.000Z | purchase   | 852        | 3484                     |
| 5           | 2020-03-31T00:00:00.000Z | purchase   | 783        | 2701                     |
| 5           | 2020-04-02T00:00:00.000Z | withdrawal | 490        | 3191                     |
| 6           | 2020-01-11T00:00:00.000Z | deposit    | 831        | 831                      |
| 6           | 2020-01-14T00:00:00.000Z | purchase   | 11         | 780                      |
| 6           | 2020-01-14T00:00:00.000Z | purchase   | 40         | 780                      |
| 6           | 2020-01-18T00:00:00.000Z | purchase   | 66         | 714                      |
| 6           | 2020-01-25T00:00:00.000Z | deposit    | 796        | 1510                     |
| 6           | 2020-01-28T00:00:00.000Z | purchase   | 777        | 733                      |
| 6           | 2020-02-10T00:00:00.000Z | purchase   | 962        | -229                     |
| 6           | 2020-02-24T00:00:00.000Z | deposit    | 240        | 11                       |
| 6           | 2020-02-27T00:00:00.000Z | deposit    | 106        | 286                      |
| 6           | 2020-02-27T00:00:00.000Z | withdrawal | 169        | 286                      |
| 6           | 2020-03-01T00:00:00.000Z | withdrawal | 500        | 786                      |
| 6           | 2020-03-03T00:00:00.000Z | deposit    | 582        | 1368                     |
| 6           | 2020-03-04T00:00:00.000Z | deposit    | 250        | 1618                     |
| 6           | 2020-03-10T00:00:00.000Z | deposit    | 619        | 2237                     |
| 6           | 2020-03-15T00:00:00.000Z | deposit    | 763        | 3000                     |
| 6           | 2020-03-16T00:00:00.000Z | deposit    | 535        | 3535                     |
| 6           | 2020-03-23T00:00:00.000Z | purchase   | 968        | 2567                     |
| 6           | 2020-03-26T00:00:00.000Z | withdrawal | 484        | 3051                     |
| 6           | 2020-03-31T00:00:00.000Z | withdrawal | 405        | 3456                     |
| 7           | 2020-01-20T00:00:00.000Z | deposit    | 964        | 964                      |
| 7           | 2020-02-03T00:00:00.000Z | purchase   | 77         | 887                      |
| 7           | 2020-02-06T00:00:00.000Z | deposit    | 688        | 1575                     |
| 7           | 2020-02-11T00:00:00.000Z | deposit    | 93         | 1668                     |
| 7           | 2020-02-22T00:00:00.000Z | deposit    | 617        | 2285                     |
| 7           | 2020-02-29T00:00:00.000Z | deposit    | 888        | 3173                     |
| 7           | 2020-03-03T00:00:00.000Z | purchase   | 328        | 2845                     |
| 7           | 2020-03-04T00:00:00.000Z | withdrawal | 29         | 2874                     |
| 7           | 2020-03-10T00:00:00.000Z | deposit    | 723        | 3597                     |
| 7           | 2020-03-16T00:00:00.000Z | purchase   | 962        | 2635                     |
| 7           | 2020-03-22T00:00:00.000Z | withdrawal | 44         | 2679                     |
| 7           | 2020-04-04T00:00:00.000Z | withdrawal | 525        | 3204                     |
| 7           | 2020-04-17T00:00:00.000Z | deposit    | 615        | 3819                     |
| 8           | 2020-01-15T00:00:00.000Z | deposit    | 207        | 207                      |
| 8           | 2020-01-28T00:00:00.000Z | purchase   | 566        | -359                     |
| 8           | 2020-01-30T00:00:00.000Z | deposit    | 946        | 587                      |
| 8           | 2020-02-06T00:00:00.000Z | withdrawal | 180        | 767                      |
| 8           | 2020-03-05T00:00:00.000Z | deposit    | 956        | 1723                     |
| 8           | 2020-03-27T00:00:00.000Z | withdrawal | 775        | 2498                     |
| 8           | 2020-03-28T00:00:00.000Z | withdrawal | 178        | 2676                     |
| 8           | 2020-03-30T00:00:00.000Z | purchase   | 467        | 2209                     |
| 8           | 2020-04-11T00:00:00.000Z | purchase   | 323        | 1886                     |
| 8           | 2020-04-13T00:00:00.000Z | purchase   | 649        | 1237                     |
| 9           | 2020-01-21T00:00:00.000Z | deposit    | 669        | 669                      |
| 9           | 2020-01-25T00:00:00.000Z | deposit    | 180        | 849                      |
| 9           | 2020-02-15T00:00:00.000Z | withdrawal | 195        | 1044                     |
| 9           | 2020-03-04T00:00:00.000Z | deposit    | 381        | 1425                     |
| 9           | 2020-03-05T00:00:00.000Z | deposit    | 982        | 2407                     |
| 9           | 2020-03-10T00:00:00.000Z | deposit    | 13         | 2420                     |
| 9           | 2020-03-16T00:00:00.000Z | withdrawal | 446        | 2866                     |
| 9           | 2020-04-09T00:00:00.000Z | withdrawal | 976        | 3842                     |
| 9           | 2020-04-10T00:00:00.000Z | withdrawal | 699        | 4541                     |
| 9           | 2020-04-16T00:00:00.000Z | deposit    | 953        | 5494                     |
| 10          | 2020-01-13T00:00:00.000Z | deposit    | 556        | 556                      |
| 10          | 2020-01-15T00:00:00.000Z | purchase   | 775        | -219                     |
| 10          | 2020-01-18T00:00:00.000Z | withdrawal | 738        | 82                       |
| 10          | 2020-01-18T00:00:00.000Z | purchase   | 437        | 82                       |
| 10          | 2020-01-24T00:00:00.000Z | withdrawal | 746        | 828                      |
| 10          | 2020-01-26T00:00:00.000Z | deposit    | 518        | 1346                     |
| 10          | 2020-02-04T00:00:00.000Z | withdrawal | 830        | 2176                     |
| 10          | 2020-02-05T00:00:00.000Z | deposit    | 925        | 3101                     |
| 10          | 2020-02-08T00:00:00.000Z | purchase   | 214        | 2887                     |
| 10          | 2020-02-13T00:00:00.000Z | deposit    | 399        | 3286                     |
| 10          | 2020-03-03T00:00:00.000Z | purchase   | 983        | 2303                     |
| 10          | 2020-03-04T00:00:00.000Z | withdrawal | 282        | 2585                     |
| 10          | 2020-03-26T00:00:00.000Z | purchase   | 146        | 2439                     |
| 10          | 2020-04-04T00:00:00.000Z | withdrawal | 328        | 2767                     |
| 10          | 2020-04-06T00:00:00.000Z | deposit    | 307        | 3074                     |
| 10          | 2020-04-09T00:00:00.000Z | withdrawal | 492        | 2716                     |
| 10          | 2020-04-09T00:00:00.000Z | purchase   | 850        | 2716                     |
| 10          | 2020-04-10T00:00:00.000Z | purchase   | 974        | 1742                     |
| 11          | 2020-01-19T00:00:00.000Z | deposit    | 60         | 60                       |
| 11          | 2020-01-20T00:00:00.000Z | purchase   | 409        | -1744                    |
| 11          | 2020-01-20T00:00:00.000Z | purchase   | 947        | -1744                    |
| 11          | 2020-01-20T00:00:00.000Z | purchase   | 448        | -1744                    |
| 11          | 2020-02-04T00:00:00.000Z | withdrawal | 350        | -1394                    |
| 11          | 2020-02-25T00:00:00.000Z | withdrawal | 375        | -1019                    |
| 11          | 2020-03-07T00:00:00.000Z | deposit    | 320        | -699                     |
| 11          | 2020-03-15T00:00:00.000Z | deposit    | 549        | -150                     |
| 11          | 2020-03-19T00:00:00.000Z | purchase   | 806        | -640                     |
| 11          | 2020-03-19T00:00:00.000Z | deposit    | 316        | -640                     |
| 11          | 2020-03-20T00:00:00.000Z | purchase   | 302        | -805                     |
| 11          | 2020-03-20T00:00:00.000Z | withdrawal | 137        | -805                     |
| 11          | 2020-03-23T00:00:00.000Z | deposit    | 178        | -627                     |
| 11          | 2020-03-24T00:00:00.000Z | deposit    | 852        | 225                      |
| 11          | 2020-03-31T00:00:00.000Z | purchase   | 10         | -364                     |
| 11          | 2020-03-31T00:00:00.000Z | purchase   | 579        | -364                     |
| 11          | 2020-04-16T00:00:00.000Z | withdrawal | 328        | -36                      |
| 12          | 2020-01-13T00:00:00.000Z | deposit    | 202        | 202                      |
| 12          | 2020-01-28T00:00:00.000Z | withdrawal | 110        | 312                      |
| 12          | 2020-03-18T00:00:00.000Z | withdrawal | 739        | 1051                     |
| 12          | 2020-03-23T00:00:00.000Z | deposit    | 942        | 1993                     |
| 13          | 2020-01-02T00:00:00.000Z | deposit    | 566        | 566                      |
| 13          | 2020-01-04T00:00:00.000Z | withdrawal | 87         | 653                      |
| 13          | 2020-01-08T00:00:00.000Z | deposit    | 107        | 760                      |
| 13          | 2020-01-22T00:00:00.000Z | deposit    | 858        | 1618                     |
| 13          | 2020-01-28T00:00:00.000Z | purchase   | 664        | 954                      |
| 13          | 2020-02-04T00:00:00.000Z | deposit    | 55         | 1009                     |
| 13          | 2020-02-12T00:00:00.000Z | withdrawal | 456        | 1465                     |
| 13          | 2020-02-13T00:00:00.000Z | deposit    | 149        | 2365                     |
| 13          | 2020-02-13T00:00:00.000Z | deposit    | 751        | 2365                     |
| 13          | 2020-03-09T00:00:00.000Z | withdrawal | 543        | 2908                     |
| 13          | 2020-03-13T00:00:00.000Z | withdrawal | 95         | 3003                     |
| 13          | 2020-03-14T00:00:00.000Z | deposit    | 665        | 3668                     |
| 13          | 2020-03-16T00:00:00.000Z | deposit    | 99         | 3767                     |
| 14          | 2020-01-25T00:00:00.000Z | deposit    | 205        | 205                      |
| 14          | 2020-02-22T00:00:00.000Z | deposit    | 616        | 821                      |
| 14          | 2020-04-05T00:00:00.000Z | deposit    | 756        | 2165                     |
| 14          | 2020-04-05T00:00:00.000Z | withdrawal | 588        | 2165                     |
| 15          | 2020-01-25T00:00:00.000Z | deposit    | 379        | 379                      |
| 15          | 2020-04-02T00:00:00.000Z | deposit    | 723        | 1102                     |
| 16          | 2020-01-13T00:00:00.000Z | deposit    | 421        | 421                      |
| 16          | 2020-01-17T00:00:00.000Z | purchase   | 529        | 706                      |
| 16          | 2020-01-17T00:00:00.000Z | withdrawal | 814        | 706                      |
| 16          | 2020-01-20T00:00:00.000Z | purchase   | 159        | 547                      |
| 16          | 2020-01-22T00:00:00.000Z | deposit    | 239        | 56                       |
| 16          | 2020-01-22T00:00:00.000Z | purchase   | 730        | 56                       |
| 16          | 2020-01-25T00:00:00.000Z | purchase   | 160        | -104                     |
| 16          | 2020-01-30T00:00:00.000Z | deposit    | 391        | 287                      |
| 16          | 2020-02-02T00:00:00.000Z | deposit    | 919        | 1206                     |
| 16          | 2020-02-09T00:00:00.000Z | withdrawal | 429        | 1635                     |
| 16          | 2020-02-13T00:00:00.000Z | purchase   | 599        | 1964                     |
| 16          | 2020-02-13T00:00:00.000Z | withdrawal | 928        | 1964                     |
| 16          | 2020-02-26T00:00:00.000Z | purchase   | 515        | 1449                     |
| 16          | 2020-03-01T00:00:00.000Z | withdrawal | 314        | 1763                     |
| 16          | 2020-03-13T00:00:00.000Z | purchase   | 903        | 860                      |
| 16          | 2020-03-23T00:00:00.000Z | withdrawal | 174        | 1034                     |
| 16          | 2020-04-11T00:00:00.000Z | deposit    | 862        | 1896                     |
| 17          | 2020-01-19T00:00:00.000Z | deposit    | 465        | 465                      |
| 17          | 2020-02-09T00:00:00.000Z | withdrawal | 915        | 1380                     |
| 17          | 2020-02-28T00:00:00.000Z | purchase   | 442        | 938                      |
| 18          | 2020-01-17T00:00:00.000Z | deposit    | 757        | 757                      |
| 18          | 2020-02-06T00:00:00.000Z | withdrawal | 865        | 1622                     |
| 18          | 2020-02-13T00:00:00.000Z | purchase   | 316        | 1306                     |
| 18          | 2020-03-08T00:00:00.000Z | withdrawal | 588        | 1894                     |
| 18          | 2020-03-12T00:00:00.000Z | deposit    | 354        | 2248                     |
| 18          | 2020-03-17T00:00:00.000Z | withdrawal | 558        | 2806                     |
| 18          | 2020-03-25T00:00:00.000Z | deposit    | 374        | 3180                     |
| 18          | 2020-04-03T00:00:00.000Z | deposit    | 27         | 3207                     |
| 19          | 2020-01-17T00:00:00.000Z | deposit    | 47         | 47                       |
| 19          | 2020-01-22T00:00:00.000Z | purchase   | 59         | -12                      |
| 19          | 2020-02-06T00:00:00.000Z | withdrawal | 61         | 49                       |
| 19          | 2020-02-21T00:00:00.000Z | purchase   | 178        | -129                     |
| 19          | 2020-03-03T00:00:00.000Z | deposit    | 509        | 380                      |
| 19          | 2020-03-10T00:00:00.000Z | withdrawal | 559        | 939                      |
| 19          | 2020-04-07T00:00:00.000Z | deposit    | 343        | 1282                     |
| 20          | 2020-01-18T00:00:00.000Z | deposit    | 868        | 868                      |
| 20          | 2020-01-28T00:00:00.000Z | withdrawal | 403        | 1271                     |
| 20          | 2020-02-06T00:00:00.000Z | deposit    | 512        | 1783                     |
| 20          | 2020-02-13T00:00:00.000Z | deposit    | 40         | 1823                     |
| 20          | 2020-02-15T00:00:00.000Z | withdrawal | 156        | 1979                     |
| 20          | 2020-02-24T00:00:00.000Z | withdrawal | 342        | 2321                     |
| 20          | 2020-03-10T00:00:00.000Z | deposit    | 257        | 2578                     |
| 21          | 2020-01-12T00:00:00.000Z | deposit    | 298        | 326                      |
| 21          | 2020-01-12T00:00:00.000Z | deposit    | 28         | 326                      |
| 21          | 2020-01-15T00:00:00.000Z | withdrawal | 497        | 823                      |
| 21          | 2020-01-20T00:00:00.000Z | purchase   | 445        | 378                      |
| 21          | 2020-01-27T00:00:00.000Z | deposit    | 412        | 790                      |
| 21          | 2020-02-07T00:00:00.000Z | purchase   | 637        | 153                      |
| 21          | 2020-02-18T00:00:00.000Z | purchase   | 348        | -195                     |
| 21          | 2020-02-26T00:00:00.000Z | deposit    | 694        | 499                      |
| 21          | 2020-02-28T00:00:00.000Z | withdrawal | 269        | 768                      |
| 21          | 2020-03-03T00:00:00.000Z | withdrawal | 605        | 1345                     |
| 21          | 2020-03-03T00:00:00.000Z | purchase   | 28         | 1345                     |
| 21          | 2020-03-06T00:00:00.000Z | deposit    | 713        | 2058                     |
| 21          | 2020-03-17T00:00:00.000Z | deposit    | 103        | 2161                     |
| 21          | 2020-03-22T00:00:00.000Z | withdrawal | 406        | 2567                     |
| 21          | 2020-03-23T00:00:00.000Z | purchase   | 489        | 2078                     |
| 21          | 2020-03-30T00:00:00.000Z | withdrawal | 398        | 2476                     |
| 21          | 2020-04-03T00:00:00.000Z | withdrawal | 531        | 3007                     |
| 21          | 2020-04-04T00:00:00.000Z | withdrawal | 848        | 3855                     |
| 22          | 2020-01-19T00:00:00.000Z | deposit    | 794        | 794                      |
| 22          | 2020-01-28T00:00:00.000Z | purchase   | 559        | 235                      |
| 22          | 2020-02-02T00:00:00.000Z | deposit    | 490        | 725                      |
| 22          | 2020-02-04T00:00:00.000Z | withdrawal | 544        | 1269                     |
| 22          | 2020-02-09T00:00:00.000Z | purchase   | 842        | 427                      |
| 22          | 2020-02-11T00:00:00.000Z | purchase   | 783        | -356                     |
| 22          | 2020-02-24T00:00:00.000Z | deposit    | 272        | -84                      |
| 22          | 2020-02-26T00:00:00.000Z | deposit    | 863        | 779                      |
| 22          | 2020-02-29T00:00:00.000Z | withdrawal | 730        | 1509                     |
| 22          | 2020-03-05T00:00:00.000Z | deposit    | 532        | 2041                     |
| 22          | 2020-03-16T00:00:00.000Z | deposit    | 865        | 2906                     |
| 22          | 2020-03-17T00:00:00.000Z | withdrawal | 370        | 3276                     |
| 22          | 2020-03-27T00:00:00.000Z | purchase   | 394        | 2882                     |
| 22          | 2020-03-29T00:00:00.000Z | deposit    | 801        | 3683                     |
| 22          | 2020-03-30T00:00:00.000Z | withdrawal | 544        | 4227                     |
| 22          | 2020-04-05T00:00:00.000Z | withdrawal | 80         | 4307                     |
| 22          | 2020-04-09T00:00:00.000Z | deposit    | 728        | 5035                     |
| 22          | 2020-04-14T00:00:00.000Z | withdrawal | 875        | 5910                     |
| 22          | 2020-04-17T00:00:00.000Z | purchase   | 982        | 4928                     |
| 23          | 2020-01-21T00:00:00.000Z | deposit    | 334        | 334                      |
| 23          | 2020-01-22T00:00:00.000Z | purchase   | 240        | 94                       |
| 23          | 2020-02-12T00:00:00.000Z | withdrawal | 408        | 502                      |
| 23          | 2020-03-08T00:00:00.000Z | deposit    | 834        | 1336                     |
| 23          | 2020-03-31T00:00:00.000Z | purchase   | 676        | 660                      |
| 23          | 2020-04-08T00:00:00.000Z | withdrawal | 522        | 1182                     |
| 24          | 2020-01-26T00:00:00.000Z | deposit    | 615        | 615                      |
| 24          | 2020-02-07T00:00:00.000Z | withdrawal | 505        | 1120                     |
| 24          | 2020-02-09T00:00:00.000Z | withdrawal | 149        | 1269                     |
| 24          | 2020-02-12T00:00:00.000Z | deposit    | 440        | 1491                     |
| 24          | 2020-02-12T00:00:00.000Z | purchase   | 218        | 1491                     |
| 24          | 2020-02-17T00:00:00.000Z | deposit    | 275        | 1766                     |
| 24          | 2020-02-29T00:00:00.000Z | deposit    | 355        | 2121                     |
| 24          | 2020-03-06T00:00:00.000Z | purchase   | 289        | 1832                     |
| 24          | 2020-03-09T00:00:00.000Z | deposit    | 275        | 1562                     |
| 24          | 2020-03-09T00:00:00.000Z | purchase   | 545        | 1562                     |
| 25          | 2020-01-28T00:00:00.000Z | deposit    | 174        | 174                      |
| 25          | 2020-02-08T00:00:00.000Z | deposit    | 259        | 433                      |
| 25          | 2020-02-13T00:00:00.000Z | withdrawal | 833        | 1266                     |
| 25          | 2020-03-05T00:00:00.000Z | deposit    | 430        | 1696                     |
| 25          | 2020-03-09T00:00:00.000Z | withdrawal | 123        | 1819                     |
| 25          | 2020-03-18T00:00:00.000Z | withdrawal | 629        | 2448                     |
| 25          | 2020-03-19T00:00:00.000Z | deposit    | 185        | 2633                     |
| 25          | 2020-03-21T00:00:00.000Z | purchase   | 683        | 1950                     |
| 25          | 2020-04-09T00:00:00.000Z | deposit    | 769        | 2719                     |
| 25          | 2020-04-17T00:00:00.000Z | deposit    | 432        | 3151                     |
| 25          | 2020-04-24T00:00:00.000Z | withdrawal | 285        | 3436                     |
| 26          | 2020-01-17T00:00:00.000Z | deposit    | 878        | 878                      |
| 26          | 2020-01-26T00:00:00.000Z | withdrawal | 338        | 1314                     |
| 26          | 2020-01-26T00:00:00.000Z | deposit    | 98         | 1314                     |
| 26          | 2020-02-06T00:00:00.000Z | purchase   | 352        | 962                      |
| 26          | 2020-02-27T00:00:00.000Z | withdrawal | 300        | 1279                     |
| 26          | 2020-02-27T00:00:00.000Z | withdrawal | 17         | 1279                     |
| 26          | 2020-03-06T00:00:00.000Z | deposit    | 192        | 1471                     |
| 26          | 2020-03-10T00:00:00.000Z | withdrawal | 381        | 1852                     |
| 26          | 2020-03-11T00:00:00.000Z | withdrawal | 437        | 2289                     |
| 26          | 2020-03-13T00:00:00.000Z | deposit    | 35         | 2324                     |
| 26          | 2020-04-04T00:00:00.000Z | withdrawal | 456        | 2780                     |
| 26          | 2020-04-13T00:00:00.000Z | withdrawal | 792        | 3572                     |
| 27          | 2020-01-01T00:00:00.000Z | deposit    | 809        | 809                      |
| 27          | 2020-01-02T00:00:00.000Z | withdrawal | 604        | 1413                     |
| 27          | 2020-01-05T00:00:00.000Z | deposit    | 161        | 1574                     |
| 27          | 2020-01-08T00:00:00.000Z | deposit    | 134        | 1708                     |
| 27          | 2020-01-16T00:00:00.000Z | withdrawal | 263        | 1971                     |
| 27          | 2020-01-21T00:00:00.000Z | purchase   | 843        | 1128                     |
| 27          | 2020-01-25T00:00:00.000Z | withdrawal | 583        | 1711                     |
| 27          | 2020-02-02T00:00:00.000Z | withdrawal | 666        | 2377                     |
| 27          | 2020-02-07T00:00:00.000Z | deposit    | 734        | 3111                     |
| 27          | 2020-02-14T00:00:00.000Z | withdrawal | 690        | 3801                     |
| 27          | 2020-02-16T00:00:00.000Z | purchase   | 505        | 3296                     |
| 27          | 2020-02-25T00:00:00.000Z | deposit    | 692        | 3988                     |
| 27          | 2020-02-28T00:00:00.000Z | deposit    | 911        | 4899                     |
| 27          | 2020-03-03T00:00:00.000Z | purchase   | 769        | 4130                     |
| 27          | 2020-03-11T00:00:00.000Z | withdrawal | 992        | 5122                     |
| 27          | 2020-03-12T00:00:00.000Z | purchase   | 175        | 4947                     |
| 27          | 2020-03-13T00:00:00.000Z | deposit    | 71         | 5018                     |
| 27          | 2020-03-14T00:00:00.000Z | purchase   | 490        | 4528                     |
| 27          | 2020-03-16T00:00:00.000Z | deposit    | 521        | 5049                     |
| 27          | 2020-03-25T00:00:00.000Z | purchase   | 569        | 4480                     |
| 28          | 2020-01-20T00:00:00.000Z | deposit    | 451        | 451                      |
| 28          | 2020-02-02T00:00:00.000Z | withdrawal | 387        | 838                      |
| 28          | 2020-02-12T00:00:00.000Z | purchase   | 882        | -44                      |
| 28          | 2020-03-16T00:00:00.000Z | deposit    | 274        | 230                      |
| 28          | 2020-03-17T00:00:00.000Z | withdrawal | 501        | 731                      |
| 28          | 2020-03-25T00:00:00.000Z | purchase   | 183        | 548                      |
| 28          | 2020-04-06T00:00:00.000Z | deposit    | 677        | 1225                     |
| 28          | 2020-04-17T00:00:00.000Z | deposit    | 823        | 2048                     |
| 29          | 2020-01-19T00:00:00.000Z | deposit    | 217        | 217                      |
| 29          | 2020-01-25T00:00:00.000Z | withdrawal | 522        | 739                      |
| 29          | 2020-01-28T00:00:00.000Z | withdrawal | 360        | 1099                     |
| 29          | 2020-01-31T00:00:00.000Z | deposit    | 527        | 1626                     |
| 29          | 2020-02-09T00:00:00.000Z | deposit    | 937        | 2563                     |
| 29          | 2020-02-13T00:00:00.000Z | purchase   | 509        | 2054                     |
| 29          | 2020-02-15T00:00:00.000Z | purchase   | 366        | 1688                     |
| 29          | 2020-03-03T00:00:00.000Z | withdrawal | 834        | 2522                     |
| 29          | 2020-03-07T00:00:00.000Z | deposit    | 606        | 3128                     |
| 29          | 2020-03-16T00:00:00.000Z | withdrawal | 1          | 3129                     |
| 29          | 2020-03-20T00:00:00.000Z | deposit    | 335        | 3464                     |
| 29          | 2020-03-24T00:00:00.000Z | deposit    | 948        | 4412                     |
| 29          | 2020-03-25T00:00:00.000Z | withdrawal | 147        | 4559                     |
| 29          | 2020-04-10T00:00:00.000Z | withdrawal | 682        | 6041                     |
| 29          | 2020-04-10T00:00:00.000Z | deposit    | 800        | 6041                     |
| 29          | 2020-04-16T00:00:00.000Z | purchase   | 576        | 5465                     |
| 29          | 2020-04-17T00:00:00.000Z | withdrawal | 921        | 6386                     |
| 30          | 2020-01-26T00:00:00.000Z | deposit    | 33         | 33                       |
| 30          | 2020-02-28T00:00:00.000Z | withdrawal | 464        | 497                      |
| 30          | 2020-04-01T00:00:00.000Z | deposit    | 392        | 889                      |
| 30          | 2020-04-24T00:00:00.000Z | deposit    | 547        | 1436                     |
| 31          | 2020-01-06T00:00:00.000Z | deposit    | 83         | 83                       |
| 31          | 2020-03-06T00:00:00.000Z | purchase   | 247        | -164                     |
| 31          | 2020-03-18T00:00:00.000Z | withdrawal | 929        | 765                      |
| 31          | 2020-03-24T00:00:00.000Z | deposit    | 952        | 1717                     |
| 32          | 2020-01-12T00:00:00.000Z | deposit    | 812        | 812                      |
| 32          | 2020-01-15T00:00:00.000Z | purchase   | 352        | 460                      |
| 32          | 2020-01-19T00:00:00.000Z | purchase   | 527        | -67                      |
| 32          | 2020-01-28T00:00:00.000Z | deposit    | 0          | 30                       |
| 32          | 2020-01-28T00:00:00.000Z | deposit    | 97         | 30                       |
| 32          | 2020-01-29T00:00:00.000Z | withdrawal | 119        | 149                      |
| 32          | 2020-02-09T00:00:00.000Z | deposit    | 957        | 1106                     |
| 32          | 2020-02-12T00:00:00.000Z | deposit    | 215        | 1321                     |
| 32          | 2020-02-24T00:00:00.000Z | withdrawal | 707        | 2028                     |
| 32          | 2020-03-10T00:00:00.000Z | purchase   | 483        | 1545                     |
| 32          | 2020-03-15T00:00:00.000Z | withdrawal | 517        | 2062                     |
| 32          | 2020-03-16T00:00:00.000Z | purchase   | 219        | 1843                     |
| 32          | 2020-04-07T00:00:00.000Z | purchase   | 158        | 1685                     |
| 33          | 2020-01-24T00:00:00.000Z | deposit    | 473        | 473                      |
| 33          | 2020-02-05T00:00:00.000Z | withdrawal | 321        | 794                      |
| 33          | 2020-02-08T00:00:00.000Z | deposit    | 176        | 970                      |
| 33          | 2020-02-14T00:00:00.000Z | purchase   | 778        | 192                      |
| 33          | 2020-02-26T00:00:00.000Z | deposit    | 334        | 526                      |
| 33          | 2020-03-01T00:00:00.000Z | purchase   | 581        | -37                      |
| 33          | 2020-03-01T00:00:00.000Z | deposit    | 18         | -37                      |
| 33          | 2020-03-03T00:00:00.000Z | deposit    | 260        | 223                      |
| 33          | 2020-03-08T00:00:00.000Z | withdrawal | 63         | 286                      |
| 33          | 2020-03-15T00:00:00.000Z | deposit    | 454        | 740                      |
| 33          | 2020-03-18T00:00:00.000Z | deposit    | 732        | 1472                     |
| 33          | 2020-03-26T00:00:00.000Z | purchase   | 351        | 1121                     |
| 33          | 2020-03-29T00:00:00.000Z | deposit    | 872        | 1993                     |
| 33          | 2020-04-01T00:00:00.000Z | purchase   | 375        | 1618                     |
| 33          | 2020-04-08T00:00:00.000Z | purchase   | 559        | 1059                     |
| 33          | 2020-04-09T00:00:00.000Z | deposit    | 602        | 1661                     |
| 33          | 2020-04-18T00:00:00.000Z | deposit    | 184        | 1845                     |
| 33          | 2020-04-22T00:00:00.000Z | withdrawal | 88         | 1933                     |
| 34          | 2020-01-30T00:00:00.000Z | deposit    | 976        | 976                      |
| 34          | 2020-02-01T00:00:00.000Z | purchase   | 396        | 580                      |
| 34          | 2020-02-13T00:00:00.000Z | withdrawal | 510        | 1090                     |
| 34          | 2020-02-26T00:00:00.000Z | withdrawal | 417        | 1507                     |
| 34          | 2020-03-05T00:00:00.000Z | purchase   | 165        | 1342                     |
| 34          | 2020-03-06T00:00:00.000Z | deposit    | 327        | 1669                     |
| 35          | 2020-01-17T00:00:00.000Z | deposit    | 936        | 936                      |
| 35          | 2020-01-19T00:00:00.000Z | purchase   | 159        | 777                      |
| 35          | 2020-01-25T00:00:00.000Z | deposit    | 472        | 1652                     |
| 35          | 2020-01-25T00:00:00.000Z | withdrawal | 403        | 1652                     |
| 35          | 2020-01-26T00:00:00.000Z | purchase   | 339        | 1313                     |
| 35          | 2020-02-03T00:00:00.000Z | withdrawal | 733        | 2046                     |
| 35          | 2020-02-06T00:00:00.000Z | purchase   | 595        | 1451                     |
| 35          | 2020-03-01T00:00:00.000Z | deposit    | 305        | 978                      |
| 35          | 2020-03-01T00:00:00.000Z | purchase   | 778        | 978                      |
| 35          | 2020-03-13T00:00:00.000Z | purchase   | 706        | 272                      |
| 35          | 2020-03-18T00:00:00.000Z | deposit    | 664        | 936                      |
| 35          | 2020-03-20T00:00:00.000Z | deposit    | 500        | 1436                     |
| 35          | 2020-03-30T00:00:00.000Z | purchase   | 327        | 1109                     |
| 36          | 2020-01-30T00:00:00.000Z | deposit    | 149        | 149                      |
| 36          | 2020-02-09T00:00:00.000Z | deposit    | 990        | 1139                     |
| 36          | 2020-02-12T00:00:00.000Z | withdrawal | 849        | 1988                     |
| 36          | 2020-03-16T00:00:00.000Z | purchase   | 280        | 1794                     |
| 36          | 2020-03-16T00:00:00.000Z | deposit    | 86         | 1794                     |
| 36          | 2020-03-19T00:00:00.000Z | deposit    | 421        | 2215                     |
| 36          | 2020-03-28T00:00:00.000Z | deposit    | 524        | 2739                     |
| 36          | 2020-04-22T00:00:00.000Z | deposit    | 560        | 3299                     |
| 36          | 2020-04-28T00:00:00.000Z | purchase   | 610        | 2125                     |
| 36          | 2020-04-28T00:00:00.000Z | purchase   | 564        | 2125                     |
| 37          | 2020-01-29T00:00:00.000Z | deposit    | 946        | 946                      |
| 37          | 2020-01-30T00:00:00.000Z | purchase   | 861        | 85                       |
| 37          | 2020-02-03T00:00:00.000Z | purchase   | 331        | -246                     |
| 37          | 2020-02-06T00:00:00.000Z | deposit    | 544        | 298                      |
| 37          | 2020-02-08T00:00:00.000Z | purchase   | 922        | -624                     |
| 37          | 2020-02-11T00:00:00.000Z | deposit    | 630        | 6                        |
| 37          | 2020-02-15T00:00:00.000Z | deposit    | 356        | 362                      |
| 37          | 2020-02-17T00:00:00.000Z | deposit    | 666        | 1028                     |
| 37          | 2020-02-20T00:00:00.000Z | deposit    | 711        | 1739                     |
| 37          | 2020-02-28T00:00:00.000Z | purchase   | 837        | 902                      |
| 37          | 2020-03-01T00:00:00.000Z | withdrawal | 54         | 956                      |
| 37          | 2020-03-12T00:00:00.000Z | withdrawal | 360        | 1316                     |
| 37          | 2020-03-23T00:00:00.000Z | purchase   | 351        | 965                      |
| 37          | 2020-03-30T00:00:00.000Z | purchase   | 396        | 1379                     |
| 37          | 2020-03-30T00:00:00.000Z | withdrawal | 810        | 1379                     |
| 37          | 2020-04-12T00:00:00.000Z | purchase   | 80         | 1299                     |
| 37          | 2020-04-14T00:00:00.000Z | deposit    | 371        | 2482                     |
| 37          | 2020-04-14T00:00:00.000Z | withdrawal | 812        | 2482                     |
| 37          | 2020-04-17T00:00:00.000Z | deposit    | 190        | 2672                     |
| 37          | 2020-04-24T00:00:00.000Z | deposit    | 371        | 3043                     |
| 37          | 2020-04-25T00:00:00.000Z | deposit    | 730        | 3773                     |
| 37          | 2020-04-26T00:00:00.000Z | purchase   | 660        | 3113                     |
| 38          | 2020-01-21T00:00:00.000Z | purchase   | 28         | 339                      |
| 38          | 2020-01-21T00:00:00.000Z | deposit    | 367        | 339                      |
| 38          | 2020-01-27T00:00:00.000Z | purchase   | 700        | -361                     |
| 38          | 2020-01-30T00:00:00.000Z | deposit    | 728        | 367                      |
| 38          | 2020-02-11T00:00:00.000Z | deposit    | 475        | 842                      |
| 38          | 2020-02-14T00:00:00.000Z | purchase   | 894        | 31                       |
| 38          | 2020-02-14T00:00:00.000Z | deposit    | 83         | 31                       |
| 38          | 2020-02-21T00:00:00.000Z | purchase   | 496        | -465                     |
| 38          | 2020-03-04T00:00:00.000Z | purchase   | 788        | -1253                    |
| 38          | 2020-03-07T00:00:00.000Z | purchase   | 42         | -1295                    |
| 38          | 2020-03-16T00:00:00.000Z | deposit    | 410        | -885                     |
| 38          | 2020-03-18T00:00:00.000Z | deposit    | 354        | -659                     |
| 38          | 2020-03-18T00:00:00.000Z | purchase   | 128        | -659                     |
| 38          | 2020-03-22T00:00:00.000Z | deposit    | 724        | 65                       |
| 38          | 2020-03-25T00:00:00.000Z | purchase   | 628        | -563                     |
| 38          | 2020-03-26T00:00:00.000Z | purchase   | 235        | -798                     |
| 38          | 2020-04-07T00:00:00.000Z | deposit    | 759        | -39                      |
| 38          | 2020-04-11T00:00:00.000Z | deposit    | 152        | 113                      |
| 38          | 2020-04-19T00:00:00.000Z | withdrawal | 409        | -428                     |
| 38          | 2020-04-19T00:00:00.000Z | purchase   | 950        | -428                     |
| 39          | 2020-01-22T00:00:00.000Z | deposit    | 996        | 1429                     |
| 39          | 2020-01-22T00:00:00.000Z | deposit    | 433        | 1429                     |
| 39          | 2020-02-01T00:00:00.000Z | deposit    | 608        | 2037                     |
| 39          | 2020-02-10T00:00:00.000Z | deposit    | 73         | 2110                     |
| 39          | 2020-02-15T00:00:00.000Z | deposit    | 792        | 2902                     |
| 39          | 2020-02-19T00:00:00.000Z | withdrawal | 281        | 3183                     |
| 39          | 2020-02-27T00:00:00.000Z | purchase   | 233        | 2950                     |
| 39          | 2020-03-04T00:00:00.000Z | deposit    | 536        | 3486                     |
| 39          | 2020-03-25T00:00:00.000Z | withdrawal | 409        | 3895                     |
| 39          | 2020-03-27T00:00:00.000Z | withdrawal | 55         | 3950                     |
| 39          | 2020-04-01T00:00:00.000Z | purchase   | 375        | 3575                     |
| 39          | 2020-04-04T00:00:00.000Z | purchase   | 28         | 3547                     |
| 39          | 2020-04-08T00:00:00.000Z | withdrawal | 240        | 3787                     |
| 39          | 2020-04-09T00:00:00.000Z | deposit    | 939        | 5255                     |
| 39          | 2020-04-09T00:00:00.000Z | withdrawal | 529        | 5255                     |
| 39          | 2020-04-13T00:00:00.000Z | withdrawal | 644        | 5899                     |
| 39          | 2020-04-17T00:00:00.000Z | deposit    | 933        | 6832                     |
| 40          | 2020-01-21T00:00:00.000Z | deposit    | 857        | 857                      |
| 40          | 2020-01-26T00:00:00.000Z | withdrawal | 510        | 1367                     |
| 40          | 2020-02-11T00:00:00.000Z | deposit    | 914        | 2281                     |
| 40          | 2020-02-13T00:00:00.000Z | withdrawal | 630        | 2911                     |
| 40          | 2020-02-16T00:00:00.000Z | purchase   | 737        | 2174                     |
| 40          | 2020-02-20T00:00:00.000Z | deposit    | 401        | 2575                     |
| 40          | 2020-03-05T00:00:00.000Z | deposit    | 934        | 3509                     |
| 40          | 2020-03-11T00:00:00.000Z | purchase   | 275        | 3234                     |
| 40          | 2020-03-20T00:00:00.000Z | purchase   | 712        | 2522                     |
| 40          | 2020-03-25T00:00:00.000Z | deposit    | 417        | 2939                     |
| 40          | 2020-04-03T00:00:00.000Z | withdrawal | 867        | 3806                     |
| 41          | 2020-01-30T00:00:00.000Z | deposit    | 790        | 790                      |
| 41          | 2020-01-31T00:00:00.000Z | withdrawal | 836        | 1626                     |
| 41          | 2020-02-02T00:00:00.000Z | deposit    | 443        | 2069                     |
| 41          | 2020-02-06T00:00:00.000Z | deposit    | 84         | 2153                     |
| 41          | 2020-02-23T00:00:00.000Z | deposit    | 898        | 3051                     |
| 41          | 2020-03-05T00:00:00.000Z | deposit    | 914        | 3965                     |
| 41          | 2020-03-12T00:00:00.000Z | purchase   | 293        | 3823                     |
| 41          | 2020-03-12T00:00:00.000Z | deposit    | 151        | 3823                     |
| 41          | 2020-03-15T00:00:00.000Z | purchase   | 397        | 3426                     |
| 41          | 2020-03-22T00:00:00.000Z | deposit    | 232        | 3658                     |
| 41          | 2020-03-23T00:00:00.000Z | deposit    | 582        | 4240                     |
| 41          | 2020-03-25T00:00:00.000Z | deposit    | 872        | 5112                     |
| 41          | 2020-03-26T00:00:00.000Z | deposit    | 65         | 4560                     |
| 41          | 2020-03-26T00:00:00.000Z | purchase   | 617        | 4560                     |
| 41          | 2020-03-27T00:00:00.000Z | deposit    | 689        | 5249                     |
| 41          | 2020-03-30T00:00:00.000Z | purchase   | 136        | 5113                     |
| 41          | 2020-04-04T00:00:00.000Z | withdrawal | 177        | 5290                     |
| 41          | 2020-04-25T00:00:00.000Z | withdrawal | 739        | 6029                     |
| 42          | 2020-01-11T00:00:00.000Z | deposit    | 154        | 154                      |
| 42          | 2020-01-21T00:00:00.000Z | deposit    | 989        | 1143                     |
| 42          | 2020-01-28T00:00:00.000Z | withdrawal | 696        | 1839                     |
| 42          | 2020-02-04T00:00:00.000Z | purchase   | 457        | 1382                     |
| 42          | 2020-02-09T00:00:00.000Z | deposit    | 9          | 1391                     |
| 42          | 2020-02-14T00:00:00.000Z | deposit    | 900        | 2291                     |
| 42          | 2020-02-24T00:00:00.000Z | purchase   | 897        | 1394                     |
| 42          | 2020-02-25T00:00:00.000Z | deposit    | 210        | 1604                     |
| 42          | 2020-02-29T00:00:00.000Z | deposit    | 855        | 2459                     |
| 42          | 2020-03-02T00:00:00.000Z | purchase   | 675        | 1784                     |
| 42          | 2020-03-03T00:00:00.000Z | withdrawal | 163        | 1947                     |
| 42          | 2020-03-14T00:00:00.000Z | purchase   | 662        | 1285                     |
| 42          | 2020-03-30T00:00:00.000Z | purchase   | 454        | 831                      |
| 42          | 2020-04-09T00:00:00.000Z | withdrawal | 999        | 1830                     |
| 43          | 2020-01-28T00:00:00.000Z | deposit    | 318        | 318                      |
| 43          | 2020-01-31T00:00:00.000Z | withdrawal | 519        | 837                      |
| 43          | 2020-02-09T00:00:00.000Z | deposit    | 875        | 1712                     |
| 43          | 2020-02-14T00:00:00.000Z | withdrawal | 96         | 1808                     |
| 43          | 2020-02-20T00:00:00.000Z | purchase   | 314        | 1494                     |
| 43          | 2020-02-23T00:00:00.000Z | purchase   | 670        | 824                      |
| 43          | 2020-03-08T00:00:00.000Z | deposit    | 971        | 1795                     |
| 43          | 2020-03-18T00:00:00.000Z | withdrawal | 412        | 2207                     |
| 43          | 2020-03-27T00:00:00.000Z | deposit    | 716        | 2923                     |
| 43          | 2020-04-07T00:00:00.000Z | purchase   | 842        | 2081                     |
| 43          | 2020-04-24T00:00:00.000Z | deposit    | 518        | 2599                     |
| 44          | 2020-01-19T00:00:00.000Z | deposit    | 71         | 71                       |
| 44          | 2020-01-20T00:00:00.000Z | withdrawal | 761        | 832                      |
| 44          | 2020-02-12T00:00:00.000Z | deposit    | 671        | 1503                     |
| 44          | 2020-04-08T00:00:00.000Z | purchase   | 320        | 1183                     |
| 45          | 2020-01-14T00:00:00.000Z | deposit    | 650        | 650                      |
| 45          | 2020-01-15T00:00:00.000Z | deposit    | 392        | 1042                     |
| 45          | 2020-01-16T00:00:00.000Z | purchase   | 296        | 746                      |
| 45          | 2020-01-17T00:00:00.000Z | deposit    | 915        | 1661                     |
| 45          | 2020-01-18T00:00:00.000Z | purchase   | 281        | 1380                     |
| 45          | 2020-01-24T00:00:00.000Z | withdrawal | 656        | 2036                     |
| 45          | 2020-01-25T00:00:00.000Z | deposit    | 997        | 3033                     |
| 45          | 2020-01-27T00:00:00.000Z | purchase   | 465        | 2568                     |
| 45          | 2020-01-30T00:00:00.000Z | purchase   | 316        | 2252                     |
| 45          | 2020-02-03T00:00:00.000Z | withdrawal | 760        | 3012                     |
| 45          | 2020-02-13T00:00:00.000Z | withdrawal | 11         | 3023                     |
| 45          | 2020-02-15T00:00:00.000Z | withdrawal | 10         | 3033                     |
| 45          | 2020-02-18T00:00:00.000Z | withdrawal | 983        | 4016                     |
| 45          | 2020-02-28T00:00:00.000Z | purchase   | 328        | 3688                     |
| 45          | 2020-03-05T00:00:00.000Z | deposit    | 357        | 4045                     |
| 45          | 2020-03-09T00:00:00.000Z | deposit    | 609        | 4654                     |
| 45          | 2020-03-29T00:00:00.000Z | deposit    | 434        | 5088                     |
| 45          | 2020-03-31T00:00:00.000Z | deposit    | 336        | 5424                     |
| 46          | 2020-01-23T00:00:00.000Z | deposit    | 356        | 356                      |
| 46          | 2020-01-24T00:00:00.000Z | purchase   | 495        | -139                     |
| 46          | 2020-01-31T00:00:00.000Z | deposit    | 661        | 522                      |
| 46          | 2020-02-15T00:00:00.000Z | purchase   | 104        | 418                      |
| 46          | 2020-02-16T00:00:00.000Z | deposit    | 970        | 1388                     |
| 46          | 2020-03-03T00:00:00.000Z | deposit    | 101        | 1489                     |
| 46          | 2020-03-04T00:00:00.000Z | purchase   | 294        | 1195                     |
| 46          | 2020-03-14T00:00:00.000Z | purchase   | 574        | 621                      |
| 46          | 2020-03-23T00:00:00.000Z | withdrawal | 541        | 1162                     |
| 46          | 2020-04-01T00:00:00.000Z | purchase   | 885        | 277                      |
| 46          | 2020-04-03T00:00:00.000Z | deposit    | 631        | 908                      |
| 46          | 2020-04-14T00:00:00.000Z | purchase   | 152        | 756                      |
| 46          | 2020-04-20T00:00:00.000Z | deposit    | 430        | 1186                     |
| 47          | 2020-01-22T00:00:00.000Z | deposit    | 203        | -244                     |
| 47          | 2020-01-22T00:00:00.000Z | purchase   | 447        | -244                     |
| 47          | 2020-01-26T00:00:00.000Z | withdrawal | 554        | 310                      |
| 47          | 2020-01-31T00:00:00.000Z | withdrawal | 822        | 1599                     |
| 47          | 2020-01-31T00:00:00.000Z | deposit    | 467        | 1599                     |
| 47          | 2020-02-03T00:00:00.000Z | purchase   | 35         | 1564                     |
| 47          | 2020-02-04T00:00:00.000Z | withdrawal | 647        | 2211                     |
| 47          | 2020-02-12T00:00:00.000Z | deposit    | 496        | 2707                     |
| 47          | 2020-02-14T00:00:00.000Z | deposit    | 307        | 2482                     |
| 47          | 2020-02-14T00:00:00.000Z | purchase   | 532        | 2482                     |
| 47          | 2020-02-26T00:00:00.000Z | deposit    | 281        | 2763                     |
| 47          | 2020-03-05T00:00:00.000Z | purchase   | 466        | 2297                     |
| 47          | 2020-03-15T00:00:00.000Z | withdrawal | 707        | 3004                     |
| 47          | 2020-03-26T00:00:00.000Z | withdrawal | 275        | 3279                     |
| 47          | 2020-03-28T00:00:00.000Z | deposit    | 867        | 4146                     |
| 47          | 2020-03-31T00:00:00.000Z | withdrawal | 998        | 5144                     |
| 47          | 2020-04-08T00:00:00.000Z | purchase   | 307        | 4837                     |
| 48          | 2020-01-01T00:00:00.000Z | deposit    | 427        | 427                      |
| 48          | 2020-01-09T00:00:00.000Z | withdrawal | 784        | 1211                     |
| 48          | 2020-01-14T00:00:00.000Z | purchase   | 144        | 533                      |
| 48          | 2020-01-14T00:00:00.000Z | purchase   | 534        | 533                      |
| 48          | 2020-01-23T00:00:00.000Z | purchase   | 339        | 1589                     |
| 48          | 2020-01-23T00:00:00.000Z | withdrawal | 955        | 1589                     |
| 48          | 2020-01-23T00:00:00.000Z | withdrawal | 440        | 1589                     |
| 48          | 2020-01-25T00:00:00.000Z | withdrawal | 236        | 1825                     |
| 48          | 2020-01-27T00:00:00.000Z | deposit    | 166        | 1991                     |
| 48          | 2020-01-29T00:00:00.000Z | deposit    | 471        | 2462                     |
| 48          | 2020-02-05T00:00:00.000Z | purchase   | 950        | 1512                     |
| 48          | 2020-02-15T00:00:00.000Z | withdrawal | 199        | 1711                     |
| 48          | 2020-02-16T00:00:00.000Z | purchase   | 84         | 1627                     |
| 48          | 2020-02-17T00:00:00.000Z | withdrawal | 38         | 1665                     |
| 48          | 2020-02-23T00:00:00.000Z | deposit    | 856        | 2521                     |
| 48          | 2020-02-29T00:00:00.000Z | withdrawal | 189        | 2710                     |
| 48          | 2020-03-07T00:00:00.000Z | purchase   | 600        | 2110                     |
| 48          | 2020-03-17T00:00:00.000Z | deposit    | 472        | 2582                     |
| 48          | 2020-03-26T00:00:00.000Z | purchase   | 645        | 1937                     |
| 49          | 2020-01-04T00:00:00.000Z | deposit    | 432        | 432                      |
| 49          | 2020-01-15T00:00:00.000Z | purchase   | 127        | 305                      |
| 49          | 2020-01-19T00:00:00.000Z | withdrawal | 712        | 1017                     |
| 49          | 2020-01-25T00:00:00.000Z | deposit    | 541        | 1558                     |
| 49          | 2020-01-27T00:00:00.000Z | withdrawal | 531        | 2089                     |
| 49          | 2020-02-11T00:00:00.000Z | withdrawal | 790        | 2879                     |
| 49          | 2020-02-24T00:00:00.000Z | deposit    | 83         | 2962                     |
| 49          | 2020-02-28T00:00:00.000Z | deposit    | 510        | 3472                     |
| 49          | 2020-03-02T00:00:00.000Z | deposit    | 295        | 4448                     |
| 49          | 2020-03-02T00:00:00.000Z | withdrawal | 681        | 4448                     |
| 49          | 2020-03-04T00:00:00.000Z | deposit    | 699        | 5147                     |
| 49          | 2020-03-05T00:00:00.000Z | purchase   | 806        | 4341                     |
| 49          | 2020-03-14T00:00:00.000Z | deposit    | 366        | 4707                     |
| 49          | 2020-03-20T00:00:00.000Z | purchase   | 85         | 4622                     |
| 49          | 2020-03-21T00:00:00.000Z | purchase   | 521        | 4101                     |
| 49          | 2020-03-23T00:00:00.000Z | deposit    | 760        | 4861                     |
| 49          | 2020-03-25T00:00:00.000Z | withdrawal | 736        | 5597                     |
| 49          | 2020-03-27T00:00:00.000Z | purchase   | 644        | 4953                     |
| 49          | 2020-03-30T00:00:00.000Z | purchase   | 609        | 4344                     |
| 50          | 2020-01-29T00:00:00.000Z | deposit    | 899        | 899                      |
| 50          | 2020-01-31T00:00:00.000Z | deposit    | 32         | 931                      |
| 50          | 2020-02-02T00:00:00.000Z | withdrawal | 774        | 1705                     |
| 50          | 2020-02-08T00:00:00.000Z | withdrawal | 870        | 2575                     |
| 50          | 2020-02-13T00:00:00.000Z | deposit    | 279        | 2854                     |
| 50          | 2020-02-18T00:00:00.000Z | purchase   | 240        | 2614                     |
| 50          | 2020-03-01T00:00:00.000Z | deposit    | 249        | 2863                     |
| 50          | 2020-03-10T00:00:00.000Z | deposit    | 640        | 3503                     |
| 50          | 2020-03-13T00:00:00.000Z | purchase   | 324        | 3179                     |
| 50          | 2020-03-20T00:00:00.000Z | withdrawal | 21         | 3200                     |
| 50          | 2020-03-22T00:00:00.000Z | deposit    | 969        | 4169                     |
| 50          | 2020-03-24T00:00:00.000Z | purchase   | 564        | 3605                     |
| 50          | 2020-04-14T00:00:00.000Z | purchase   | 60         | 3545                     |
| 50          | 2020-04-24T00:00:00.000Z | deposit    | 235        | 3780                     |
| 51          | 2020-01-20T00:00:00.000Z | deposit    | 367        | 367                      |
| 51          | 2020-01-25T00:00:00.000Z | withdrawal | 66         | 433                      |
| 51          | 2020-02-01T00:00:00.000Z | purchase   | 905        | -472                     |
| 51          | 2020-02-02T00:00:00.000Z | purchase   | 150        | -622                     |
| 51          | 2020-02-22T00:00:00.000Z | deposit    | 49         | -573                     |
| 51          | 2020-02-29T00:00:00.000Z | deposit    | 608        | 35                       |
| 51          | 2020-03-19T00:00:00.000Z | deposit    | 707        | 742                      |
| 51          | 2020-03-22T00:00:00.000Z | deposit    | 760        | 1502                     |
| 51          | 2020-03-27T00:00:00.000Z | purchase   | 591        | 911                      |
| 51          | 2020-04-12T00:00:00.000Z | deposit    | 72         | 983                      |
| 51          | 2020-04-16T00:00:00.000Z | deposit    | 513        | 1496                     |
| 52          | 2020-01-12T00:00:00.000Z | deposit    | 908        | 908                      |
| 52          | 2020-01-26T00:00:00.000Z | deposit    | 232        | 1140                     |
| 52          | 2020-02-05T00:00:00.000Z | deposit    | 819        | 1959                     |
| 52          | 2020-02-15T00:00:00.000Z | deposit    | 653        | 2612                     |
| 53          | 2020-01-24T00:00:00.000Z | deposit    | 22         | 22                       |
| 53          | 2020-02-04T00:00:00.000Z | deposit    | 188        | 210                      |
| 53          | 2020-03-21T00:00:00.000Z | purchase   | 285        | -75                      |
| 53          | 2020-03-23T00:00:00.000Z | withdrawal | 881        | 806                      |
| 53          | 2020-03-24T00:00:00.000Z | deposit    | 228        | 1034                     |
| 53          | 2020-04-20T00:00:00.000Z | purchase   | 187        | 1780                     |
| 53          | 2020-04-20T00:00:00.000Z | deposit    | 933        | 1780                     |
| 53          | 2020-04-22T00:00:00.000Z | deposit    | 209        | 1989                     |
| 54          | 2020-01-09T00:00:00.000Z | deposit    | 138        | 138                      |
| 54          | 2020-01-26T00:00:00.000Z | deposit    | 736        | 874                      |
| 54          | 2020-01-29T00:00:00.000Z | deposit    | 677        | 1551                     |
| 54          | 2020-01-30T00:00:00.000Z | deposit    | 107        | 1658                     |
| 54          | 2020-02-19T00:00:00.000Z | purchase   | 29         | 1629                     |
| 54          | 2020-03-24T00:00:00.000Z | purchase   | 922        | 707                      |
| 54          | 2020-03-29T00:00:00.000Z | withdrawal | 174        | 881                      |
| 54          | 2020-04-03T00:00:00.000Z | deposit    | 435        | 1316                     |
| 55          | 2020-01-25T00:00:00.000Z | deposit    | 380        | 380                      |
| 55          | 2020-02-01T00:00:00.000Z | purchase   | 558        | -178                     |
| 55          | 2020-02-12T00:00:00.000Z | withdrawal | 570        | 392                      |
| 55          | 2020-02-15T00:00:00.000Z | deposit    | 408        | -6                       |
| 55          | 2020-02-15T00:00:00.000Z | purchase   | 806        | -6                       |
| 55          | 2020-02-17T00:00:00.000Z | deposit    | 139        | 133                      |
| 55          | 2020-02-28T00:00:00.000Z | deposit    | 597        | 730                      |
| 55          | 2020-03-03T00:00:00.000Z | withdrawal | 55         | 785                      |
| 55          | 2020-03-23T00:00:00.000Z | deposit    | 814        | 1599                     |
| 55          | 2020-04-02T00:00:00.000Z | purchase   | 585        | 1014                     |
| 55          | 2020-04-06T00:00:00.000Z | purchase   | 277        | 737                      |
| 56          | 2020-01-18T00:00:00.000Z | deposit    | 864        | 864                      |
| 56          | 2020-01-23T00:00:00.000Z | withdrawal | 412        | 1276                     |
| 56          | 2020-01-29T00:00:00.000Z | purchase   | 519        | 757                      |
| 56          | 2020-02-01T00:00:00.000Z | deposit    | 122        | 879                      |
| 56          | 2020-02-05T00:00:00.000Z | purchase   | 735        | 144                      |
| 56          | 2020-02-12T00:00:00.000Z | purchase   | 213        | -69                      |
| 56          | 2020-02-14T00:00:00.000Z | purchase   | 37         | -106                     |
| 56          | 2020-02-17T00:00:00.000Z | withdrawal | 716        | 610                      |
| 56          | 2020-03-02T00:00:00.000Z | withdrawal | 523        | 1133                     |
| 56          | 2020-03-03T00:00:00.000Z | purchase   | 744        | 389                      |
| 56          | 2020-03-07T00:00:00.000Z | deposit    | 224        | 613                      |
| 56          | 2020-03-13T00:00:00.000Z | purchase   | 99         | 514                      |
| 56          | 2020-03-20T00:00:00.000Z | deposit    | 218        | 732                      |
| 56          | 2020-03-30T00:00:00.000Z | deposit    | 495        | 1227                     |
| 56          | 2020-04-02T00:00:00.000Z | deposit    | 117        | 1344                     |
| 56          | 2020-04-04T00:00:00.000Z | withdrawal | 302        | 1646                     |
| 56          | 2020-04-07T00:00:00.000Z | purchase   | 873        | 773                      |
| 56          | 2020-04-08T00:00:00.000Z | withdrawal | 326        | 1099                     |
| 56          | 2020-04-12T00:00:00.000Z | withdrawal | 407        | 1506                     |
| 57          | 2020-01-06T00:00:00.000Z | deposit    | 907        | 907                      |
| 57          | 2020-01-21T00:00:00.000Z | purchase   | 469        | 438                      |
| 57          | 2020-01-24T00:00:00.000Z | purchase   | 202        | 414                      |
| 57          | 2020-01-24T00:00:00.000Z | deposit    | 178        | 414                      |
| 57          | 2020-02-13T00:00:00.000Z | purchase   | 515        | -101                     |
| 57          | 2020-03-03T00:00:00.000Z | purchase   | 765        | -866                     |
| 58          | 2020-01-11T00:00:00.000Z | deposit    | 726        | 726                      |
| 58          | 2020-01-13T00:00:00.000Z | withdrawal | 775        | 1501                     |
| 58          | 2020-01-19T00:00:00.000Z | deposit    | 432        | 1933                     |
| 58          | 2020-02-02T00:00:00.000Z | deposit    | 866        | 2799                     |
| 58          | 2020-02-08T00:00:00.000Z | deposit    | 333        | 3132                     |
| 58          | 2020-02-14T00:00:00.000Z | purchase   | 415        | 2717                     |
| 58          | 2020-02-25T00:00:00.000Z | deposit    | 937        | 3654                     |
| 58          | 2020-02-28T00:00:00.000Z | purchase   | 407        | 3247                     |
| 58          | 2020-03-06T00:00:00.000Z | withdrawal | 425        | 3672                     |
| 58          | 2020-03-10T00:00:00.000Z | purchase   | 358        | 3314                     |
| 58          | 2020-03-17T00:00:00.000Z | withdrawal | 210        | 3524                     |
| 58          | 2020-03-20T00:00:00.000Z | withdrawal | 939        | 4463                     |
| 58          | 2020-03-22T00:00:00.000Z | purchase   | 958        | 3505                     |
| 58          | 2020-03-23T00:00:00.000Z | deposit    | 237        | 3742                     |
| 58          | 2020-03-27T00:00:00.000Z | purchase   | 240        | 3502                     |
| 58          | 2020-04-02T00:00:00.000Z | purchase   | 384        | 4063                     |
| 58          | 2020-04-02T00:00:00.000Z | deposit    | 945        | 4063                     |
| 59          | 2020-01-20T00:00:00.000Z | deposit    | 924        | 924                      |
| 59          | 2020-02-07T00:00:00.000Z | deposit    | 570        | 1494                     |
| 59          | 2020-02-09T00:00:00.000Z | deposit    | 50         | 1544                     |
| 59          | 2020-02-13T00:00:00.000Z | deposit    | 646        | 2190                     |
| 59          | 2020-03-02T00:00:00.000Z | withdrawal | 105        | 2295                     |
| 59          | 2020-03-26T00:00:00.000Z | withdrawal | 433        | 2728                     |
| 59          | 2020-04-15T00:00:00.000Z | purchase   | 854        | 1874                     |
| 60          | 2020-01-19T00:00:00.000Z | deposit    | 495        | 495                      |
| 60          | 2020-01-26T00:00:00.000Z | deposit    | 113        | 608                      |
| 60          | 2020-01-30T00:00:00.000Z | purchase   | 797        | -189                     |
| 60          | 2020-02-01T00:00:00.000Z | deposit    | 857        | 668                      |
| 60          | 2020-03-02T00:00:00.000Z | deposit    | 188        | 856                      |
| 60          | 2020-03-16T00:00:00.000Z | withdrawal | 674        | 1530                     |
| 60          | 2020-03-31T00:00:00.000Z | withdrawal | 927        | 2457                     |
| 60          | 2020-04-02T00:00:00.000Z | withdrawal | 424        | 2881                     |
| 61          | 2020-01-21T00:00:00.000Z | deposit    | 319        | 319                      |
| 61          | 2020-01-22T00:00:00.000Z | purchase   | 752        | -433                     |
| 61          | 2020-01-24T00:00:00.000Z | deposit    | 587        | 154                      |
| 61          | 2020-01-29T00:00:00.000Z | withdrawal | 14         | 250                      |
| 61          | 2020-01-29T00:00:00.000Z | deposit    | 82         | 250                      |
| 61          | 2020-02-02T00:00:00.000Z | deposit    | 518        | 768                      |
| 61          | 2020-02-06T00:00:00.000Z | deposit    | 6          | 774                      |
| 61          | 2020-02-09T00:00:00.000Z | withdrawal | 689        | 1463                     |
| 61          | 2020-02-19T00:00:00.000Z | deposit    | 332        | 1795                     |
| 61          | 2020-02-29T00:00:00.000Z | withdrawal | 66         | 1861                     |
| 61          | 2020-03-17T00:00:00.000Z | deposit    | 897        | 3267                     |
| 61          | 2020-03-17T00:00:00.000Z | withdrawal | 509        | 3267                     |
| 61          | 2020-03-18T00:00:00.000Z | deposit    | 322        | 3589                     |
| 61          | 2020-03-23T00:00:00.000Z | purchase   | 309        | 3280                     |
| 61          | 2020-03-24T00:00:00.000Z | withdrawal | 989        | 4269                     |
| 61          | 2020-03-26T00:00:00.000Z | withdrawal | 497        | 5539                     |
| 61          | 2020-03-26T00:00:00.000Z | withdrawal | 773        | 5539                     |
| 61          | 2020-03-27T00:00:00.000Z | purchase   | 552        | 4987                     |
| 61          | 2020-03-31T00:00:00.000Z | purchase   | 480        | 5364                     |
| 61          | 2020-03-31T00:00:00.000Z | deposit    | 857        | 5364                     |
| 61          | 2020-04-04T00:00:00.000Z | purchase   | 845        | 4519                     |
| 61          | 2020-04-15T00:00:00.000Z | deposit    | 318        | 4837                     |
| 62          | 2020-01-16T00:00:00.000Z | deposit    | 218        | 218                      |
| 62          | 2020-01-24T00:00:00.000Z | purchase   | 430        | -212                     |
| 62          | 2020-03-16T00:00:00.000Z | purchase   | 551        | -763                     |
| 63          | 2020-01-06T00:00:00.000Z | deposit    | 234        | 234                      |
| 63          | 2020-01-10T00:00:00.000Z | purchase   | 253        | -19                      |
| 63          | 2020-01-16T00:00:00.000Z | purchase   | 88         | -107                     |
| 63          | 2020-01-25T00:00:00.000Z | purchase   | 225        | -332                     |
| 63          | 2020-02-08T00:00:00.000Z | purchase   | 432        | -764                     |
| 63          | 2020-02-11T00:00:00.000Z | deposit    | 363        | -401                     |
| 63          | 2020-02-23T00:00:00.000Z | withdrawal | 396        | -5                       |
| 63          | 2020-02-24T00:00:00.000Z | withdrawal | 156        | 151                      |
| 63          | 2020-03-06T00:00:00.000Z | withdrawal | 151        | 302                      |
| 63          | 2020-03-10T00:00:00.000Z | withdrawal | 932        | 1234                     |
| 63          | 2020-03-12T00:00:00.000Z | purchase   | 618        | 616                      |
| 63          | 2020-03-23T00:00:00.000Z | withdrawal | 727        | 1343                     |
| 63          | 2020-03-31T00:00:00.000Z | purchase   | 565        | 778                      |
| 64          | 2020-01-08T00:00:00.000Z | deposit    | 442        | 442                      |
| 64          | 2020-01-25T00:00:00.000Z | deposit    | 993        | 1435                     |
| 64          | 2020-01-26T00:00:00.000Z | deposit    | 897        | 2332                     |
| 64          | 2020-02-03T00:00:00.000Z | deposit    | 49         | 2381                     |
| 64          | 2020-02-11T00:00:00.000Z | purchase   | 464        | 1917                     |
| 64          | 2020-02-18T00:00:00.000Z | withdrawal | 363        | 2280                     |
| 64          | 2020-03-08T00:00:00.000Z | deposit    | 156        | 2436                     |
| 64          | 2020-03-22T00:00:00.000Z | withdrawal | 904        | 3340                     |
| 64          | 2020-03-29T00:00:00.000Z | purchase   | 561        | 2779                     |
| 65          | 2020-01-26T00:00:00.000Z | deposit    | 690        | 690                      |
| 65          | 2020-01-30T00:00:00.000Z | purchase   | 665        | 25                       |
| 65          | 2020-03-03T00:00:00.000Z | purchase   | 81         | -56                      |
| 65          | 2020-03-17T00:00:00.000Z | deposit    | 260        | 204                      |
| 65          | 2020-03-26T00:00:00.000Z | withdrawal | 558        | 666                      |
| 65          | 2020-03-26T00:00:00.000Z | purchase   | 96         | 666                      |
| 65          | 2020-04-10T00:00:00.000Z | purchase   | 931        | -265                     |
| 66          | 2020-01-16T00:00:00.000Z | deposit    | 917        | 917                      |
| 66          | 2020-01-17T00:00:00.000Z | deposit    | 175        | 1092                     |
| 66          | 2020-01-20T00:00:00.000Z | deposit    | 463        | 1555                     |
| 66          | 2020-01-22T00:00:00.000Z | deposit    | 493        | 2048                     |
| 66          | 2020-01-23T00:00:00.000Z | purchase   | 77         | 1971                     |
| 66          | 2020-02-20T00:00:00.000Z | purchase   | 422        | 1549                     |
| 66          | 2020-02-21T00:00:00.000Z | withdrawal | 57         | 1606                     |
| 66          | 2020-03-06T00:00:00.000Z | purchase   | 908        | 698                      |
| 66          | 2020-03-13T00:00:00.000Z | withdrawal | 528        | 1226                     |
| 66          | 2020-03-24T00:00:00.000Z | withdrawal | 573        | 1799                     |
| 67          | 2020-01-22T00:00:00.000Z | deposit    | 79         | 79                       |
| 67          | 2020-01-23T00:00:00.000Z | deposit    | 125        | 909                      |
| 67          | 2020-01-23T00:00:00.000Z | deposit    | 705        | 909                      |
| 67          | 2020-01-26T00:00:00.000Z | deposit    | 684        | 1593                     |
| 67          | 2020-02-05T00:00:00.000Z | deposit    | 748        | 2341                     |
| 67          | 2020-02-07T00:00:00.000Z | purchase   | 393        | 1948                     |
| 67          | 2020-02-18T00:00:00.000Z | deposit    | 617        | 2565                     |
| 67          | 2020-03-01T00:00:00.000Z | deposit    | 873        | 2668                     |
| 67          | 2020-03-01T00:00:00.000Z | purchase   | 770        | 2668                     |
| 67          | 2020-03-18T00:00:00.000Z | withdrawal | 907        | 3575                     |
| 67          | 2020-03-24T00:00:00.000Z | deposit    | 289        | 3864                     |
| 67          | 2020-04-02T00:00:00.000Z | deposit    | 344        | 4208                     |
| 67          | 2020-04-06T00:00:00.000Z | purchase   | 230        | 3978                     |
| 67          | 2020-04-09T00:00:00.000Z | purchase   | 191        | 3036                     |
| 67          | 2020-04-09T00:00:00.000Z | purchase   | 751        | 3036                     |
| 68          | 2020-01-20T00:00:00.000Z | deposit    | 574        | 574                      |
| 68          | 2020-02-27T00:00:00.000Z | purchase   | 296        | 278                      |
| 68          | 2020-03-03T00:00:00.000Z | purchase   | 696        | -418                     |
| 68          | 2020-03-08T00:00:00.000Z | deposit    | 488        | 70                       |
| 68          | 2020-03-17T00:00:00.000Z | purchase   | 536        | -466                     |
| 68          | 2020-03-23T00:00:00.000Z | purchase   | 224        | -690                     |
| 68          | 2020-03-24T00:00:00.000Z | deposit    | 234        | -456                     |
| 69          | 2020-01-10T00:00:00.000Z | deposit    | 124        | 124                      |
| 69          | 2020-01-17T00:00:00.000Z | deposit    | 901        | 1025                     |
| 69          | 2020-01-21T00:00:00.000Z | withdrawal | 812        | 1837                     |
| 69          | 2020-01-22T00:00:00.000Z | deposit    | 3          | 1840                     |
| 69          | 2020-01-23T00:00:00.000Z | purchase   | 193        | 1647                     |
| 69          | 2020-02-08T00:00:00.000Z | purchase   | 976        | -301                     |
| 69          | 2020-02-08T00:00:00.000Z | purchase   | 972        | -301                     |
| 69          | 2020-02-14T00:00:00.000Z | withdrawal | 216        | -85                      |
| 69          | 2020-02-16T00:00:00.000Z | deposit    | 754        | 669                      |
| 69          | 2020-02-19T00:00:00.000Z | deposit    | 168        | 837                      |
| 69          | 2020-02-22T00:00:00.000Z | withdrawal | 724        | 1110                     |
| 69          | 2020-02-22T00:00:00.000Z | purchase   | 451        | 1110                     |
| 69          | 2020-02-25T00:00:00.000Z | deposit    | 450        | 1560                     |
| 69          | 2020-03-07T00:00:00.000Z | deposit    | 792        | 2352                     |
| 69          | 2020-03-11T00:00:00.000Z | withdrawal | 541        | 2893                     |
| 69          | 2020-03-13T00:00:00.000Z | purchase   | 755        | 2138                     |
| 69          | 2020-03-16T00:00:00.000Z | withdrawal | 237        | 2375                     |
| 69          | 2020-03-24T00:00:00.000Z | deposit    | 597        | 2972                     |
| 69          | 2020-03-27T00:00:00.000Z | deposit    | 187        | 3159                     |
| 69          | 2020-03-30T00:00:00.000Z | purchase   | 437        | 2722                     |
| 69          | 2020-04-01T00:00:00.000Z | purchase   | 269        | 2453                     |
| 69          | 2020-04-04T00:00:00.000Z | purchase   | 478        | 1975                     |
| 70          | 2020-01-08T00:00:00.000Z | deposit    | 786        | 786                      |
| 70          | 2020-01-17T00:00:00.000Z | withdrawal | 265        | 1051                     |
| 70          | 2020-01-22T00:00:00.000Z | deposit    | 205        | 1256                     |
| 70          | 2020-01-26T00:00:00.000Z | purchase   | 602        | 654                      |
| 70          | 2020-01-28T00:00:00.000Z | withdrawal | 591        | 1245                     |
| 70          | 2020-01-31T00:00:00.000Z | withdrawal | 117        | 1362                     |
| 70          | 2020-02-11T00:00:00.000Z | deposit    | 221        | 1583                     |
| 70          | 2020-02-13T00:00:00.000Z | deposit    | 659        | 2242                     |
| 70          | 2020-02-25T00:00:00.000Z | purchase   | 359        | 1883                     |
| 70          | 2020-03-09T00:00:00.000Z | withdrawal | 927        | 2810                     |
| 70          | 2020-03-17T00:00:00.000Z | deposit    | 337        | 3147                     |
| 70          | 2020-03-18T00:00:00.000Z | withdrawal | 62         | 3209                     |
| 70          | 2020-03-22T00:00:00.000Z | withdrawal | 934        | 4143                     |
| 70          | 2020-03-29T00:00:00.000Z | withdrawal | 165        | 4308                     |
| 71          | 2020-01-14T00:00:00.000Z | deposit    | 128        | 128                      |
| 71          | 2020-02-17T00:00:00.000Z | withdrawal | 178        | 306                      |
| 71          | 2020-02-25T00:00:00.000Z | withdrawal | 623        | 929                      |
| 71          | 2020-03-14T00:00:00.000Z | withdrawal | 592        | 1521                     |
| 72          | 2020-01-20T00:00:00.000Z | deposit    | 796        | 796                      |
| 72          | 2020-02-06T00:00:00.000Z | deposit    | 390        | 1186                     |
| 72          | 2020-02-08T00:00:00.000Z | withdrawal | 493        | 1679                     |
| 72          | 2020-02-24T00:00:00.000Z | withdrawal | 932        | 2611                     |
| 72          | 2020-02-28T00:00:00.000Z | withdrawal | 564        | 3175                     |
| 72          | 2020-03-18T00:00:00.000Z | deposit    | 627        | 3310                     |
| 72          | 2020-03-18T00:00:00.000Z | purchase   | 492        | 3310                     |
| 72          | 2020-03-24T00:00:00.000Z | purchase   | 800        | 2510                     |
| 72          | 2020-03-28T00:00:00.000Z | purchase   | 212        | 2298                     |
| 72          | 2020-04-10T00:00:00.000Z | purchase   | 92         | 2206                     |
| 72          | 2020-04-17T00:00:00.000Z | withdrawal | 555        | 2761                     |
| 73          | 2020-01-06T00:00:00.000Z | deposit    | 442        | 442                      |
| 73          | 2020-01-10T00:00:00.000Z | deposit    | 71         | 513                      |
| 74          | 2020-01-13T00:00:00.000Z | deposit    | 229        | 229                      |
| 74          | 2020-03-21T00:00:00.000Z | deposit    | 89         | 318                      |
| 75          | 2020-01-22T00:00:00.000Z | deposit    | 234        | 234                      |
| 75          | 2020-02-21T00:00:00.000Z | deposit    | 60         | 294                      |
| 76          | 2020-01-04T00:00:00.000Z | deposit    | 553        | 1194                     |
| 76          | 2020-01-04T00:00:00.000Z | deposit    | 641        | 1194                     |
| 76          | 2020-01-05T00:00:00.000Z | withdrawal | 485        | 1679                     |
| 76          | 2020-01-11T00:00:00.000Z | deposit    | 139        | 1818                     |
| 76          | 2020-01-13T00:00:00.000Z | withdrawal | 900        | 2718                     |
| 76          | 2020-01-21T00:00:00.000Z | withdrawal | 775        | 3493                     |
| 76          | 2020-01-24T00:00:00.000Z | deposit    | 981        | 4474                     |
| 76          | 2020-01-29T00:00:00.000Z | deposit    | 771        | 5245                     |
| 76          | 2020-02-05T00:00:00.000Z | purchase   | 847        | 4398                     |
| 76          | 2020-02-08T00:00:00.000Z | deposit    | 367        | 5519                     |
| 76          | 2020-02-08T00:00:00.000Z | deposit    | 754        | 5519                     |
| 76          | 2020-02-10T00:00:00.000Z | deposit    | 859        | 6378                     |
| 76          | 2020-02-14T00:00:00.000Z | deposit    | 716        | 7094                     |
| 76          | 2020-02-23T00:00:00.000Z | purchase   | 693        | 6401                     |
| 76          | 2020-03-02T00:00:00.000Z | withdrawal | 251        | 6652                     |
| 76          | 2020-03-07T00:00:00.000Z | withdrawal | 797        | 7449                     |
| 76          | 2020-03-26T00:00:00.000Z | purchase   | 598        | 6851                     |
| 77          | 2020-01-08T00:00:00.000Z | deposit    | 120        | 120                      |
| 77          | 2020-02-19T00:00:00.000Z | deposit    | 381        | 501                      |
| 77          | 2020-03-01T00:00:00.000Z | deposit    | 616        | 1117                     |
| 77          | 2020-03-07T00:00:00.000Z | deposit    | 92         | 1209                     |
| 77          | 2020-03-08T00:00:00.000Z | withdrawal | 412        | 1621                     |
| 78          | 2020-01-28T00:00:00.000Z | deposit    | 986        | 986                      |
| 78          | 2020-01-31T00:00:00.000Z | purchase   | 292        | 694                      |
| 78          | 2020-02-03T00:00:00.000Z | purchase   | 935        | -241                     |
| 78          | 2020-02-05T00:00:00.000Z | purchase   | 640        | -881                     |
| 78          | 2020-02-11T00:00:00.000Z | deposit    | 108        | -773                     |
| 78          | 2020-02-12T00:00:00.000Z | withdrawal | 289        | -484                     |
| 78          | 2020-02-16T00:00:00.000Z | deposit    | 300        | -184                     |
| 78          | 2020-03-13T00:00:00.000Z | purchase   | 103        | -287                     |
| 78          | 2020-03-22T00:00:00.000Z | purchase   | 511        | -798                     |
| 78          | 2020-03-24T00:00:00.000Z | deposit    | 659        | -139                     |
| 78          | 2020-04-14T00:00:00.000Z | purchase   | 259        | -398                     |
| 79          | 2020-01-29T00:00:00.000Z | deposit    | 521        | 521                      |
| 79          | 2020-02-24T00:00:00.000Z | deposit    | 702        | 1223                     |
| 79          | 2020-02-29T00:00:00.000Z | deposit    | 157        | 1380                     |
| 80          | 2020-01-25T00:00:00.000Z | deposit    | 795        | 795                      |
| 80          | 2020-02-18T00:00:00.000Z | deposit    | 395        | 1190                     |
| 80          | 2020-03-13T00:00:00.000Z | purchase   | 131        | 1059                     |
| 80          | 2020-03-26T00:00:00.000Z | deposit    | 80         | 1139                     |
| 80          | 2020-03-31T00:00:00.000Z | purchase   | 517        | 622                      |
| 80          | 2020-04-16T00:00:00.000Z | purchase   | 423        | 199                      |
| 81          | 2020-01-25T00:00:00.000Z | deposit    | 403        | 403                      |
| 81          | 2020-02-12T00:00:00.000Z | purchase   | 802        | -399                     |
| 81          | 2020-02-22T00:00:00.000Z | withdrawal | 558        | 159                      |
| 81          | 2020-03-04T00:00:00.000Z | deposit    | 497        | 656                      |
| 81          | 2020-03-09T00:00:00.000Z | deposit    | 741        | 1397                     |
| 81          | 2020-03-10T00:00:00.000Z | withdrawal | 744        | 2141                     |
| 81          | 2020-03-29T00:00:00.000Z | withdrawal | 643        | 2784                     |
| 81          | 2020-04-01T00:00:00.000Z | purchase   | 224        | 2560                     |
| 81          | 2020-04-11T00:00:00.000Z | purchase   | 65         | 2495                     |
| 81          | 2020-04-14T00:00:00.000Z | deposit    | 494        | 2989                     |
| 81          | 2020-04-19T00:00:00.000Z | withdrawal | 610        | 3599                     |
| 81          | 2020-04-20T00:00:00.000Z | purchase   | 473        | 3126                     |
| 82          | 2020-01-09T00:00:00.000Z | deposit    | 363        | 363                      |
| 82          | 2020-01-15T00:00:00.000Z | purchase   | 972        | -609                     |
| 82          | 2020-01-16T00:00:00.000Z | withdrawal | 979        | 370                      |
| 82          | 2020-01-18T00:00:00.000Z | withdrawal | 193        | 563                      |
| 82          | 2020-01-26T00:00:00.000Z | purchase   | 889        | -326                     |
| 82          | 2020-01-27T00:00:00.000Z | deposit    | 854        | 528                      |
| 82          | 2020-01-28T00:00:00.000Z | withdrawal | 436        | 1724                     |
| 82          | 2020-01-28T00:00:00.000Z | withdrawal | 760        | 1724                     |
| 82          | 2020-01-30T00:00:00.000Z | purchase   | 900        | 824                      |
| 82          | 2020-02-04T00:00:00.000Z | purchase   | 74         | 750                      |
| 82          | 2020-03-06T00:00:00.000Z | withdrawal | 66         | 816                      |
| 82          | 2020-03-10T00:00:00.000Z | withdrawal | 764        | 1580                     |
| 82          | 2020-03-14T00:00:00.000Z | deposit    | 778        | 2358                     |
| 82          | 2020-03-15T00:00:00.000Z | deposit    | 789        | 3147                     |
| 82          | 2020-04-02T00:00:00.000Z | purchase   | 946        | 2201                     |
| 82          | 2020-04-03T00:00:00.000Z | purchase   | 419        | 1782                     |
| 83          | 2020-01-09T00:00:00.000Z | deposit    | 942        | 942                      |
| 83          | 2020-01-25T00:00:00.000Z | deposit    | 875        | 1817                     |
| 83          | 2020-01-27T00:00:00.000Z | purchase   | 718        | 1099                     |
| 83          | 2020-02-09T00:00:00.000Z | withdrawal | 655        | 1754                     |
| 83          | 2020-02-11T00:00:00.000Z | purchase   | 787        | 967                      |
| 83          | 2020-02-19T00:00:00.000Z | purchase   | 308        | 659                      |
| 83          | 2020-02-27T00:00:00.000Z | purchase   | 41         | 618                      |
| 83          | 2020-03-03T00:00:00.000Z | withdrawal | 301        | 919                      |
| 83          | 2020-03-09T00:00:00.000Z | deposit    | 713        | 1632                     |
| 83          | 2020-03-18T00:00:00.000Z | deposit    | 617        | 2249                     |
| 83          | 2020-03-21T00:00:00.000Z | purchase   | 827        | 1422                     |
| 83          | 2020-03-28T00:00:00.000Z | purchase   | 566        | 856                      |
| 83          | 2020-03-30T00:00:00.000Z | deposit    | 247        | 1170                     |
| 83          | 2020-03-30T00:00:00.000Z | deposit    | 67         | 1170                     |
| 83          | 2020-04-07T00:00:00.000Z | deposit    | 365        | 1535                     |
| 84          | 2020-01-23T00:00:00.000Z | deposit    | 968        | 968                      |
| 84          | 2020-03-05T00:00:00.000Z | purchase   | 359        | 609                      |
| 85          | 2020-01-11T00:00:00.000Z | deposit    | 467        | 467                      |
| 85          | 2020-03-23T00:00:00.000Z | deposit    | 609        | 1076                     |
| 85          | 2020-04-04T00:00:00.000Z | purchase   | 430        | 646                      |
| 86          | 2020-01-03T00:00:00.000Z | deposit    | 12         | 12                       |
| 86          | 2020-01-13T00:00:00.000Z | deposit    | 592        | 604                      |
| 86          | 2020-01-18T00:00:00.000Z | withdrawal | 681        | 1285                     |
| 86          | 2020-01-22T00:00:00.000Z | deposit    | 144        | 1429                     |
| 86          | 2020-01-26T00:00:00.000Z | deposit    | 143        | 2234                     |
| 86          | 2020-01-26T00:00:00.000Z | deposit    | 662        | 2234                     |
| 86          | 2020-02-06T00:00:00.000Z | purchase   | 125        | 2109                     |
| 86          | 2020-02-09T00:00:00.000Z | withdrawal | 993        | 3102                     |
| 86          | 2020-02-12T00:00:00.000Z | withdrawal | 582        | 3684                     |
| 86          | 2020-02-21T00:00:00.000Z | withdrawal | 541        | 4225                     |
| 86          | 2020-02-24T00:00:00.000Z | deposit    | 865        | 5090                     |
| 86          | 2020-03-02T00:00:00.000Z | withdrawal | 767        | 5857                     |
| 86          | 2020-03-08T00:00:00.000Z | withdrawal | 217        | 6074                     |
| 86          | 2020-03-11T00:00:00.000Z | deposit    | 901        | 6975                     |
| 86          | 2020-03-20T00:00:00.000Z | purchase   | 595        | 6380                     |
| 86          | 2020-03-22T00:00:00.000Z | deposit    | 710        | 7090                     |
| 86          | 2020-03-26T00:00:00.000Z | deposit    | 772        | 7862                     |
| 86          | 2020-03-28T00:00:00.000Z | deposit    | 356        | 8218                     |
| 86          | 2020-03-30T00:00:00.000Z | purchase   | 563        | 7655                     |
| 87          | 2020-01-13T00:00:00.000Z | deposit    | 777        | 777                      |
| 87          | 2020-01-21T00:00:00.000Z | withdrawal | 616        | 1393                     |
| 87          | 2020-01-22T00:00:00.000Z | purchase   | 524        | 869                      |
| 87          | 2020-01-29T00:00:00.000Z | purchase   | 2          | 867                      |
| 87          | 2020-02-02T00:00:00.000Z | withdrawal | 661        | 1528                     |
| 87          | 2020-02-06T00:00:00.000Z | deposit    | 561        | 2089                     |
| 87          | 2020-02-14T00:00:00.000Z | purchase   | 183        | 1906                     |
| 87          | 2020-02-17T00:00:00.000Z | withdrawal | 107        | 2013                     |
| 87          | 2020-02-19T00:00:00.000Z | purchase   | 305        | 2084                     |
| 87          | 2020-02-19T00:00:00.000Z | deposit    | 376        | 2084                     |
| 87          | 2020-02-26T00:00:00.000Z | purchase   | 682        | 1402                     |
| 87          | 2020-03-05T00:00:00.000Z | purchase   | 197        | 1205                     |
| 87          | 2020-04-05T00:00:00.000Z | deposit    | 995        | 2200                     |
| 87          | 2020-04-10T00:00:00.000Z | withdrawal | 627        | 2827                     |
| 88          | 2020-01-12T00:00:00.000Z | deposit    | 672        | 672                      |
| 88          | 2020-01-20T00:00:00.000Z | deposit    | 236        | 908                      |
| 88          | 2020-01-28T00:00:00.000Z | purchase   | 943        | -35                      |
| 88          | 2020-02-04T00:00:00.000Z | purchase   | 48         | 105                      |
| 88          | 2020-02-04T00:00:00.000Z | deposit    | 188        | 105                      |
| 88          | 2020-02-17T00:00:00.000Z | deposit    | 732        | 837                      |
| 88          | 2020-02-26T00:00:00.000Z | withdrawal | 85         | 922                      |
| 88          | 2020-03-10T00:00:00.000Z | purchase   | 908        | 14                       |
| 88          | 2020-03-27T00:00:00.000Z | purchase   | 580        | -566                     |
| 88          | 2020-04-08T00:00:00.000Z | withdrawal | 84         | -482                     |
| 89          | 2020-01-25T00:00:00.000Z | deposit    | 210        | 210                      |
| 89          | 2020-02-07T00:00:00.000Z | withdrawal | 86         | 296                      |
| 89          | 2020-02-14T00:00:00.000Z | purchase   | 537        | -241                     |
| 89          | 2020-02-17T00:00:00.000Z | purchase   | 478        | -719                     |
| 89          | 2020-02-25T00:00:00.000Z | withdrawal | 788        | 69                       |
| 89          | 2020-03-01T00:00:00.000Z | deposit    | 922        | 991                      |
| 89          | 2020-03-08T00:00:00.000Z | purchase   | 246        | 745                      |
| 89          | 2020-03-19T00:00:00.000Z | withdrawal | 757        | 1502                     |
| 89          | 2020-03-22T00:00:00.000Z | withdrawal | 418        | 1920                     |
| 89          | 2020-03-23T00:00:00.000Z | withdrawal | 475        | 2395                     |
| 89          | 2020-04-01T00:00:00.000Z | deposit    | 415        | 2810                     |
| 89          | 2020-04-06T00:00:00.000Z | deposit    | 737        | 3547                     |
| 89          | 2020-04-08T00:00:00.000Z | deposit    | 249        | 3796                     |
| 89          | 2020-04-16T00:00:00.000Z | purchase   | 864        | 2932                     |
| 89          | 2020-04-20T00:00:00.000Z | purchase   | 671        | 2621                     |
| 89          | 2020-04-20T00:00:00.000Z | withdrawal | 360        | 2621                     |
| 90          | 2020-01-19T00:00:00.000Z | deposit    | 890        | 890                      |
| 90          | 2020-01-22T00:00:00.000Z | deposit    | 472        | 1337                     |
| 90          | 2020-01-22T00:00:00.000Z | purchase   | 25         | 1337                     |
| 90          | 2020-01-29T00:00:00.000Z | withdrawal | 434        | 1771                     |
| 90          | 2020-01-31T00:00:00.000Z | deposit    | 869        | 2640                     |
| 90          | 2020-02-03T00:00:00.000Z | deposit    | 290        | 2930                     |
| 90          | 2020-02-04T00:00:00.000Z | withdrawal | 111        | 3041                     |
| 90          | 2020-02-09T00:00:00.000Z | withdrawal | 830        | 3871                     |
| 90          | 2020-02-10T00:00:00.000Z | deposit    | 365        | 4236                     |
| 90          | 2020-02-12T00:00:00.000Z | purchase   | 393        | 3843                     |
| 90          | 2020-02-16T00:00:00.000Z | withdrawal | 978        | 4821                     |
| 90          | 2020-02-23T00:00:00.000Z | purchase   | 534        | 4287                     |
| 90          | 2020-02-25T00:00:00.000Z | withdrawal | 217        | 4504                     |
| 90          | 2020-02-26T00:00:00.000Z | purchase   | 731        | 3773                     |
| 90          | 2020-02-29T00:00:00.000Z | deposit    | 132        | 3905                     |
| 90          | 2020-03-07T00:00:00.000Z | deposit    | 22         | 3927                     |
| 90          | 2020-03-09T00:00:00.000Z | deposit    | 279        | 4206                     |
| 90          | 2020-03-28T00:00:00.000Z | deposit    | 124        | 4330                     |
| 90          | 2020-03-30T00:00:00.000Z | withdrawal | 814        | 5144                     |
| 90          | 2020-04-13T00:00:00.000Z | withdrawal | 222        | 5366                     |
| 91          | 2020-01-11T00:00:00.000Z | deposit    | 856        | 856                      |
| 91          | 2020-01-21T00:00:00.000Z | withdrawal | 218        | 191                      |
| 91          | 2020-01-21T00:00:00.000Z | purchase   | 883        | 191                      |
| 91          | 2020-01-22T00:00:00.000Z | withdrawal | 145        | 679                      |
| 91          | 2020-01-22T00:00:00.000Z | deposit    | 343        | 679                      |
| 91          | 2020-02-08T00:00:00.000Z | purchase   | 533        | 146                      |
| 91          | 2020-02-10T00:00:00.000Z | withdrawal | 238        | 860                      |
| 91          | 2020-02-10T00:00:00.000Z | withdrawal | 476        | 860                      |
| 91          | 2020-02-11T00:00:00.000Z | deposit    | 426        | 1286                     |
| 91          | 2020-02-12T00:00:00.000Z | deposit    | 796        | 2082                     |
| 91          | 2020-02-17T00:00:00.000Z | withdrawal | 871        | 2953                     |
| 91          | 2020-02-25T00:00:00.000Z | purchase   | 501        | 2937                     |
| 91          | 2020-02-25T00:00:00.000Z | deposit    | 485        | 2937                     |
| 91          | 2020-03-01T00:00:00.000Z | purchase   | 979        | 1958                     |
| 91          | 2020-03-14T00:00:00.000Z | purchase   | 322        | 1636                     |
| 91          | 2020-03-17T00:00:00.000Z | deposit    | 23         | 1659                     |
| 91          | 2020-03-30T00:00:00.000Z | deposit    | 486        | 2145                     |
| 91          | 2020-03-31T00:00:00.000Z | withdrawal | 909        | 3054                     |
| 91          | 2020-04-07T00:00:00.000Z | deposit    | 165        | 3219                     |
| 92          | 2020-01-05T00:00:00.000Z | deposit    | 985        | 985                      |
| 92          | 2020-03-19T00:00:00.000Z | purchase   | 50         | 935                      |
| 92          | 2020-03-22T00:00:00.000Z | purchase   | 793        | 142                      |
| 93          | 2020-01-11T00:00:00.000Z | deposit    | 557        | 557                      |
| 93          | 2020-01-18T00:00:00.000Z | deposit    | 435        | 992                      |
| 93          | 2020-01-20T00:00:00.000Z | withdrawal | 593        | 1585                     |
| 93          | 2020-02-01T00:00:00.000Z | withdrawal | 717        | 2302                     |
| 93          | 2020-02-08T00:00:00.000Z | deposit    | 394        | 2696                     |
| 93          | 2020-02-09T00:00:00.000Z | purchase   | 366        | 2330                     |
| 93          | 2020-02-13T00:00:00.000Z | purchase   | 16         | 2314                     |
| 93          | 2020-02-16T00:00:00.000Z | deposit    | 807        | 3121                     |
| 93          | 2020-02-21T00:00:00.000Z | deposit    | 635        | 3756                     |
| 93          | 2020-02-23T00:00:00.000Z | withdrawal | 462        | 4218                     |
| 93          | 2020-02-27T00:00:00.000Z | deposit    | 429        | 4647                     |
| 93          | 2020-03-20T00:00:00.000Z | deposit    | 993        | 5640                     |
| 93          | 2020-03-27T00:00:00.000Z | withdrawal | 154        | 5794                     |
| 93          | 2020-03-29T00:00:00.000Z | withdrawal | 477        | 6271                     |
| 93          | 2020-03-30T00:00:00.000Z | purchase   | 279        | 5992                     |
| 93          | 2020-04-09T00:00:00.000Z | withdrawal | 218        | 6210                     |
| 94          | 2020-01-01T00:00:00.000Z | deposit    | 902        | 902                      |
| 94          | 2020-01-13T00:00:00.000Z | withdrawal | 435        | 1337                     |
| 94          | 2020-01-25T00:00:00.000Z | withdrawal | 449        | 1786                     |
| 94          | 2020-01-30T00:00:00.000Z | withdrawal | 784        | 2570                     |
| 94          | 2020-02-02T00:00:00.000Z | withdrawal | 738        | 3308                     |
| 94          | 2020-02-29T00:00:00.000Z | deposit    | 8          | 3316                     |
| 94          | 2020-03-08T00:00:00.000Z | withdrawal | 736        | 4052                     |
| 94          | 2020-03-23T00:00:00.000Z | deposit    | 690        | 4742                     |
| 95          | 2020-01-03T00:00:00.000Z | deposit    | 19         | 19                       |
| 95          | 2020-01-05T00:00:00.000Z | deposit    | 198        | 217                      |
| 95          | 2020-02-06T00:00:00.000Z | withdrawal | 608        | 825                      |
| 95          | 2020-02-12T00:00:00.000Z | withdrawal | 622        | 1447                     |
| 95          | 2020-02-16T00:00:00.000Z | deposit    | 706        | 2153                     |
| 95          | 2020-02-23T00:00:00.000Z | deposit    | 911        | 3064                     |
| 95          | 2020-02-24T00:00:00.000Z | withdrawal | 36         | 3100                     |
| 95          | 2020-02-26T00:00:00.000Z | deposit    | 930        | 4030                     |
| 95          | 2020-02-27T00:00:00.000Z | purchase   | 538        | 3492                     |
| 95          | 2020-03-07T00:00:00.000Z | purchase   | 321        | 3171                     |
| 95          | 2020-03-10T00:00:00.000Z | deposit    | 387        | 3558                     |
| 95          | 2020-03-22T00:00:00.000Z | deposit    | 949        | 4507                     |
| 95          | 2020-03-27T00:00:00.000Z | deposit    | 978        | 5485                     |
| 95          | 2020-03-28T00:00:00.000Z | withdrawal | 977        | 6462                     |
| 95          | 2020-03-30T00:00:00.000Z | purchase   | 530        | 5932                     |
| 96          | 2020-01-03T00:00:00.000Z | deposit    | 492        | 1245                     |
| 96          | 2020-01-03T00:00:00.000Z | deposit    | 753        | 1245                     |
| 96          | 2020-01-20T00:00:00.000Z | purchase   | 303        | 942                      |
| 96          | 2020-01-21T00:00:00.000Z | withdrawal | 290        | 1232                     |
| 96          | 2020-01-24T00:00:00.000Z | deposit    | 301        | 1533                     |
| 96          | 2020-01-31T00:00:00.000Z | deposit    | 95         | 1628                     |
| 96          | 2020-02-02T00:00:00.000Z | deposit    | 445        | 2073                     |
| 96          | 2020-02-13T00:00:00.000Z | purchase   | 30         | 2043                     |
| 96          | 2020-02-16T00:00:00.000Z | withdrawal | 65         | 2108                     |
| 96          | 2020-02-28T00:00:00.000Z | deposit    | 31         | 2139                     |
| 96          | 2020-02-29T00:00:00.000Z | deposit    | 108        | 2247                     |
| 96          | 2020-03-04T00:00:00.000Z | purchase   | 311        | 1936                     |
| 96          | 2020-03-08T00:00:00.000Z | deposit    | 488        | 2424                     |
| 96          | 2020-03-10T00:00:00.000Z | withdrawal | 545        | 2969                     |
| 96          | 2020-03-23T00:00:00.000Z | withdrawal | 490        | 3459                     |
| 96          | 2020-03-24T00:00:00.000Z | withdrawal | 417        | 3876                     |
| 96          | 2020-03-28T00:00:00.000Z | deposit    | 891        | 4767                     |
| 96          | 2020-03-30T00:00:00.000Z | purchase   | 211        | 4556                     |
| 97          | 2020-01-04T00:00:00.000Z | deposit    | 681        | 681                      |
| 97          | 2020-01-08T00:00:00.000Z | deposit    | 992        | 1673                     |
| 97          | 2020-01-16T00:00:00.000Z | withdrawal | 34         | 1707                     |
| 97          | 2020-01-21T00:00:00.000Z | purchase   | 32         | 1675                     |
| 97          | 2020-01-22T00:00:00.000Z | purchase   | 984        | 691                      |
| 97          | 2020-02-03T00:00:00.000Z | deposit    | 227        | 918                      |
| 97          | 2020-02-06T00:00:00.000Z | withdrawal | 416        | 1334                     |
| 97          | 2020-02-09T00:00:00.000Z | withdrawal | 917        | 2251                     |
| 97          | 2020-02-19T00:00:00.000Z | withdrawal | 98         | 2349                     |
| 97          | 2020-02-24T00:00:00.000Z | deposit    | 55         | 2690                     |
| 97          | 2020-02-24T00:00:00.000Z | deposit    | 286        | 2690                     |
| 97          | 2020-03-01T00:00:00.000Z | withdrawal | 249        | 2939                     |
| 97          | 2020-03-08T00:00:00.000Z | deposit    | 198        | 3137                     |
| 97          | 2020-03-23T00:00:00.000Z | purchase   | 839        | 2298                     |
| 97          | 2020-03-25T00:00:00.000Z | purchase   | 559        | 1739                     |
| 97          | 2020-03-30T00:00:00.000Z | withdrawal | 794        | 2533                     |
| 98          | 2020-01-15T00:00:00.000Z | deposit    | 622        | 622                      |
| 98          | 2020-02-25T00:00:00.000Z | withdrawal | 108        | 730                      |
| 98          | 2020-02-29T00:00:00.000Z | withdrawal | 227        | 957                      |
| 98          | 2020-03-01T00:00:00.000Z | withdrawal | 179        | 1136                     |
| 98          | 2020-03-07T00:00:00.000Z | deposit    | 193        | 1329                     |
| 98          | 2020-03-11T00:00:00.000Z | withdrawal | 648        | 1977                     |
| 98          | 2020-03-28T00:00:00.000Z | deposit    | 252        | 2229                     |
| 98          | 2020-04-01T00:00:00.000Z | withdrawal | 291        | 2520                     |
| 98          | 2020-04-02T00:00:00.000Z | deposit    | 683        | 3203                     |
| 98          | 2020-04-13T00:00:00.000Z | deposit    | 453        | 3656                     |
| 99          | 2020-01-08T00:00:00.000Z | deposit    | 160        | 160                      |
| 99          | 2020-01-21T00:00:00.000Z | deposit    | 789        | 949                      |
| 99          | 2020-02-29T00:00:00.000Z | withdrawal | 189        | 1138                     |
| 99          | 2020-03-24T00:00:00.000Z | withdrawal | 23         | 1161                     |
| 100         | 2020-01-06T00:00:00.000Z | deposit    | 158        | 158                      |
| 100         | 2020-01-14T00:00:00.000Z | deposit    | 923        | 1081                     |
| 100         | 2020-02-05T00:00:00.000Z | purchase   | 749        | 332                      |
| 100         | 2020-02-08T00:00:00.000Z | purchase   | 829        | -497                     |
| 100         | 2020-03-01T00:00:00.000Z | deposit    | 780        | 283                      |
| 100         | 2020-03-03T00:00:00.000Z | withdrawal | 123        | 406                      |
| 100         | 2020-03-19T00:00:00.000Z | purchase   | 854        | -448                     |
| 100         | 2020-03-28T00:00:00.000Z | purchase   | 938        | -1386                    |
| 100         | 2020-03-30T00:00:00.000Z | deposit    | 181        | -1205                    |
| 101         | 2020-01-12T00:00:00.000Z | deposit    | 136        | 136                      |
| 101         | 2020-01-18T00:00:00.000Z | purchase   | 620        | -484                     |
| 101         | 2020-02-05T00:00:00.000Z | withdrawal | 840        | 356                      |
| 101         | 2020-03-07T00:00:00.000Z | withdrawal | 895        | 1251                     |
| 101         | 2020-03-12T00:00:00.000Z | deposit    | 544        | 1795                     |
| 101         | 2020-03-15T00:00:00.000Z | purchase   | 535        | 1260                     |
| 101         | 2020-03-16T00:00:00.000Z | purchase   | 463        | 797                      |
| 102         | 2020-01-26T00:00:00.000Z | deposit    | 917        | 917                      |
| 102         | 2020-02-06T00:00:00.000Z | deposit    | 438        | 1355                     |
| 102         | 2020-02-11T00:00:00.000Z | purchase   | 926        | 429                      |
| 102         | 2020-02-12T00:00:00.000Z | purchase   | 243        | 186                      |
| 102         | 2020-02-16T00:00:00.000Z | deposit    | 562        | 748                      |
| 102         | 2020-02-17T00:00:00.000Z | purchase   | 265        | 483                      |
| 102         | 2020-02-21T00:00:00.000Z | deposit    | 945        | 1428                     |
| 102         | 2020-03-09T00:00:00.000Z | purchase   | 772        | 959                      |
| 102         | 2020-03-09T00:00:00.000Z | deposit    | 303        | 959                      |
| 102         | 2020-03-10T00:00:00.000Z | deposit    | 591        | 1550                     |
| 102         | 2020-03-14T00:00:00.000Z | withdrawal | 395        | 1945                     |
| 102         | 2020-03-15T00:00:00.000Z | withdrawal | 329        | 2274                     |
| 102         | 2020-03-18T00:00:00.000Z | deposit    | 639        | 3897                     |
| 102         | 2020-03-18T00:00:00.000Z | deposit    | 984        | 3897                     |
| 102         | 2020-03-26T00:00:00.000Z | withdrawal | 584        | 4481                     |
| 102         | 2020-04-02T00:00:00.000Z | deposit    | 192        | 4673                     |
| 102         | 2020-04-06T00:00:00.000Z | withdrawal | 468        | 5141                     |
| 102         | 2020-04-08T00:00:00.000Z | withdrawal | 507        | 5648                     |
| 102         | 2020-04-15T00:00:00.000Z | deposit    | 516        | 6164                     |
| 102         | 2020-04-17T00:00:00.000Z | withdrawal | 921        | 7085                     |
| 102         | 2020-04-18T00:00:00.000Z | withdrawal | 31         | 7116                     |
| 103         | 2020-01-07T00:00:00.000Z | deposit    | 646        | 646                      |
| 103         | 2020-01-14T00:00:00.000Z | withdrawal | 353        | 999                      |
| 103         | 2020-01-18T00:00:00.000Z | deposit    | 459        | 1970                     |
| 103         | 2020-01-18T00:00:00.000Z | withdrawal | 512        | 1970                     |
| 103         | 2020-02-16T00:00:00.000Z | purchase   | 535        | 880                      |
| 103         | 2020-02-16T00:00:00.000Z | purchase   | 555        | 880                      |
| 103         | 2020-03-09T00:00:00.000Z | deposit    | 410        | 1290                     |
| 103         | 2020-03-10T00:00:00.000Z | deposit    | 358        | 1648                     |
| 103         | 2020-03-18T00:00:00.000Z | purchase   | 688        | 960                      |
| 103         | 2020-03-19T00:00:00.000Z | purchase   | 435        | 1557                     |
| 103         | 2020-03-19T00:00:00.000Z | deposit    | 193        | 1557                     |
| 103         | 2020-03-19T00:00:00.000Z | withdrawal | 839        | 1557                     |
| 103         | 2020-03-26T00:00:00.000Z | purchase   | 406        | 1151                     |
| 104         | 2020-01-25T00:00:00.000Z | deposit    | 989        | 989                      |
| 104         | 2020-01-26T00:00:00.000Z | purchase   | 46         | 943                      |
| 104         | 2020-01-30T00:00:00.000Z | withdrawal | 328        | 1271                     |
| 104         | 2020-02-24T00:00:00.000Z | withdrawal | 589        | 1860                     |
| 104         | 2020-02-27T00:00:00.000Z | deposit    | 985        | 2845                     |
| 104         | 2020-02-29T00:00:00.000Z | deposit    | 76         | 2921                     |
| 104         | 2020-03-25T00:00:00.000Z | withdrawal | 321        | 3242                     |
| 104         | 2020-03-29T00:00:00.000Z | withdrawal | 414        | 3656                     |
| 104         | 2020-03-30T00:00:00.000Z | deposit    | 838        | 4494                     |
| 105         | 2020-01-07T00:00:00.000Z | deposit    | 313        | 313                      |
| 105         | 2020-01-18T00:00:00.000Z | deposit    | 701        | 1014                     |
| 105         | 2020-02-09T00:00:00.000Z | purchase   | 249        | 765                      |
| 105         | 2020-02-28T00:00:00.000Z | purchase   | 599        | 166                      |
| 105         | 2020-03-04T00:00:00.000Z | deposit    | 143        | 309                      |
| 105         | 2020-03-13T00:00:00.000Z | withdrawal | 848        | 1157                     |
| 105         | 2020-03-15T00:00:00.000Z | deposit    | 367        | 1524                     |
| 105         | 2020-03-24T00:00:00.000Z | withdrawal | 119        | 1643                     |
| 105         | 2020-03-25T00:00:00.000Z | purchase   | 329        | 1314                     |
| 105         | 2020-03-30T00:00:00.000Z | deposit    | 647        | 1961                     |
| 105         | 2020-04-01T00:00:00.000Z | purchase   | 213        | 1748                     |
| 106         | 2020-01-24T00:00:00.000Z | deposit    | 456        | 456                      |
| 106         | 2020-01-28T00:00:00.000Z | withdrawal | 261        | 717                      |
| 106         | 2020-01-29T00:00:00.000Z | withdrawal | 304        | 1021                     |
| 106         | 2020-02-01T00:00:00.000Z | deposit    | 747        | 1768                     |
| 106         | 2020-02-07T00:00:00.000Z | purchase   | 222        | 1546                     |
| 106         | 2020-02-09T00:00:00.000Z | deposit    | 976        | 2522                     |
| 106         | 2020-02-22T00:00:00.000Z | withdrawal | 546        | 3068                     |
| 106         | 2020-03-02T00:00:00.000Z | withdrawal | 443        | 3511                     |
| 106         | 2020-03-10T00:00:00.000Z | deposit    | 453        | 3964                     |
| 106         | 2020-03-11T00:00:00.000Z | deposit    | 60         | 4024                     |
| 106         | 2020-03-21T00:00:00.000Z | withdrawal | 756        | 4780                     |
| 106         | 2020-03-29T00:00:00.000Z | purchase   | 271        | 4509                     |
| 106         | 2020-04-17T00:00:00.000Z | purchase   | 728        | 3781                     |
| 106         | 2020-04-19T00:00:00.000Z | purchase   | 623        | 3158                     |
| 107         | 2020-01-13T00:00:00.000Z | deposit    | 538        | 538                      |
| 107         | 2020-01-16T00:00:00.000Z | purchase   | 682        | -144                     |
| 107         | 2020-02-17T00:00:00.000Z | withdrawal | 546        | 402                      |
| 108         | 2020-01-30T00:00:00.000Z | deposit    | 530        | 530                      |
| 108         | 2020-02-12T00:00:00.000Z | purchase   | 529        | 1                        |
| 108         | 2020-02-27T00:00:00.000Z | deposit    | 737        | 738                      |
| 108         | 2020-03-26T00:00:00.000Z | deposit    | 808        | 1546                     |
| 108         | 2020-04-05T00:00:00.000Z | deposit    | 737        | 1948                     |
| 108         | 2020-04-05T00:00:00.000Z | purchase   | 335        | 1948                     |
| 108         | 2020-04-08T00:00:00.000Z | purchase   | 163        | 1785                     |
| 108         | 2020-04-18T00:00:00.000Z | withdrawal | 279        | 3054                     |
| 108         | 2020-04-18T00:00:00.000Z | deposit    | 990        | 3054                     |
| 108         | 2020-04-25T00:00:00.000Z | deposit    | 184        | 3238                     |
| 109         | 2020-01-01T00:00:00.000Z | deposit    | 429        | 429                      |
| 109         | 2020-02-03T00:00:00.000Z | deposit    | 767        | 1196                     |
| 109         | 2020-02-05T00:00:00.000Z | deposit    | 717        | 1913                     |
| 109         | 2020-02-08T00:00:00.000Z | deposit    | 578        | 2491                     |
| 110         | 2020-01-01T00:00:00.000Z | deposit    | 888        | 888                      |
| 110         | 2020-01-06T00:00:00.000Z | withdrawal | 697        | 1585                     |
| 110         | 2020-01-07T00:00:00.000Z | withdrawal | 905        | 2490                     |
| 110         | 2020-01-09T00:00:00.000Z | deposit    | 241        | 2731                     |
| 110         | 2020-01-13T00:00:00.000Z | withdrawal | 944        | 3675                     |
| 110         | 2020-01-14T00:00:00.000Z | deposit    | 485        | 4705                     |
| 110         | 2020-01-14T00:00:00.000Z | deposit    | 545        | 4705                     |
| 110         | 2020-01-18T00:00:00.000Z | deposit    | 709        | 5894                     |
| 110         | 2020-01-18T00:00:00.000Z | deposit    | 480        | 5894                     |
| 110         | 2020-01-19T00:00:00.000Z | purchase   | 85         | 5659                     |
| 110         | 2020-01-19T00:00:00.000Z | purchase   | 150        | 5659                     |
| 110         | 2020-01-21T00:00:00.000Z | deposit    | 705        | 6364                     |
| 110         | 2020-01-26T00:00:00.000Z | purchase   | 14         | 6350                     |
| 110         | 2020-02-06T00:00:00.000Z | deposit    | 914        | 7264                     |
| 110         | 2020-02-11T00:00:00.000Z | withdrawal | 974        | 8238                     |
| 110         | 2020-03-03T00:00:00.000Z | deposit    | 417        | 8655                     |
| 110         | 2020-03-05T00:00:00.000Z | withdrawal | 373        | 9028                     |
| 110         | 2020-03-10T00:00:00.000Z | withdrawal | 202        | 9230                     |
| 110         | 2020-03-17T00:00:00.000Z | deposit    | 943        | 10173                    |
| 110         | 2020-03-29T00:00:00.000Z | deposit    | 250        | 10423                    |
| 111         | 2020-01-28T00:00:00.000Z | deposit    | 101        | 101                      |
| 111         | 2020-02-01T00:00:00.000Z | deposit    | 362        | 463                      |
| 111         | 2020-03-25T00:00:00.000Z | withdrawal | 364        | 827                      |
| 112         | 2020-01-08T00:00:00.000Z | deposit    | 945        | 945                      |
| 112         | 2020-02-09T00:00:00.000Z | deposit    | 707        | 1652                     |
| 112         | 2020-02-21T00:00:00.000Z | deposit    | 317        | 1969                     |
| 112         | 2020-02-29T00:00:00.000Z | withdrawal | 122        | 3045                     |
| 112         | 2020-02-29T00:00:00.000Z | withdrawal | 954        | 3045                     |
| 112         | 2020-03-04T00:00:00.000Z | purchase   | 523        | 2522                     |
| 112         | 2020-03-18T00:00:00.000Z | purchase   | 322        | 2200                     |
| 112         | 2020-03-24T00:00:00.000Z | withdrawal | 164        | 2364                     |
| 113         | 2020-01-21T00:00:00.000Z | deposit    | 14         | 14                       |
| 113         | 2020-01-23T00:00:00.000Z | purchase   | 525        | -511                     |
| 113         | 2020-02-04T00:00:00.000Z | deposit    | 17         | -494                     |
| 113         | 2020-02-06T00:00:00.000Z | withdrawal | 245        | -249                     |
| 113         | 2020-02-21T00:00:00.000Z | deposit    | 753        | 504                      |
| 113         | 2020-02-23T00:00:00.000Z | deposit    | 48         | 552                      |
| 113         | 2020-03-10T00:00:00.000Z | withdrawal | 544        | 1096                     |
| 113         | 2020-03-11T00:00:00.000Z | purchase   | 21         | 1075                     |
| 113         | 2020-03-13T00:00:00.000Z | withdrawal | 468        | 1543                     |
| 113         | 2020-03-23T00:00:00.000Z | deposit    | 203        | 1746                     |
| 113         | 2020-03-26T00:00:00.000Z | deposit    | 780        | 2526                     |
| 113         | 2020-04-02T00:00:00.000Z | withdrawal | 255        | 2781                     |
| 113         | 2020-04-03T00:00:00.000Z | withdrawal | 211        | 2992                     |
| 113         | 2020-04-09T00:00:00.000Z | purchase   | 686        | 2306                     |
| 114         | 2020-01-19T00:00:00.000Z | deposit    | 743        | 743                      |
| 114         | 2020-03-28T00:00:00.000Z | purchase   | 574        | 169                      |
| 114         | 2020-04-06T00:00:00.000Z | deposit    | 974        | 1143                     |
| 115         | 2020-01-29T00:00:00.000Z | deposit    | 144        | 144                      |
| 115         | 2020-02-01T00:00:00.000Z | purchase   | 400        | -256                     |
| 115         | 2020-02-08T00:00:00.000Z | withdrawal | 196        | -60                      |
| 115         | 2020-02-25T00:00:00.000Z | purchase   | 393        | -453                     |
| 115         | 2020-03-03T00:00:00.000Z | deposit    | 747        | 294                      |
| 115         | 2020-03-07T00:00:00.000Z | deposit    | 672        | 966                      |
| 115         | 2020-03-28T00:00:00.000Z | purchase   | 51         | 915                      |
| 115         | 2020-03-30T00:00:00.000Z | deposit    | 361        | 1276                     |
| 115         | 2020-04-06T00:00:00.000Z | withdrawal | 945        | 2241                     |
| 115         | 2020-04-06T00:00:00.000Z | deposit    | 20         | 2241                     |
| 116         | 2020-01-28T00:00:00.000Z | deposit    | 167        | 167                      |
| 116         | 2020-02-11T00:00:00.000Z | deposit    | 344        | 511                      |
| 116         | 2020-02-23T00:00:00.000Z | purchase   | 458        | 53                       |
| 116         | 2020-03-20T00:00:00.000Z | deposit    | 490        | 543                      |
| 116         | 2020-04-17T00:00:00.000Z | purchase   | 213        | 330                      |
| 117         | 2020-01-15T00:00:00.000Z | deposit    | 5          | 5                        |
| 117         | 2020-01-28T00:00:00.000Z | withdrawal | 30         | 35                       |
| 117         | 2020-02-12T00:00:00.000Z | deposit    | 727        | 762                      |
| 117         | 2020-02-14T00:00:00.000Z | withdrawal | 439        | 1201                     |
| 117         | 2020-02-25T00:00:00.000Z | purchase   | 479        | 722                      |
| 117         | 2020-03-13T00:00:00.000Z | deposit    | 430        | 1152                     |
| 117         | 2020-03-20T00:00:00.000Z | withdrawal | 920        | 2072                     |
| 118         | 2020-01-03T00:00:00.000Z | deposit    | 683        | 683                      |
| 118         | 2020-01-04T00:00:00.000Z | purchase   | 389        | 294                      |
| 118         | 2020-01-24T00:00:00.000Z | purchase   | 977        | -683                     |
| 118         | 2020-02-02T00:00:00.000Z | withdrawal | 3          | -507                     |
| 118         | 2020-02-02T00:00:00.000Z | deposit    | 173        | -507                     |
| 118         | 2020-03-11T00:00:00.000Z | purchase   | 795        | -1302                    |
| 118         | 2020-03-15T00:00:00.000Z | withdrawal | 342        | -960                     |
| 118         | 2020-03-30T00:00:00.000Z | deposit    | 223        | -737                     |
| 119         | 2020-01-17T00:00:00.000Z | deposit    | 62         | 62                       |
| 119         | 2020-03-09T00:00:00.000Z | withdrawal | 969        | 1031                     |
| 119         | 2020-04-10T00:00:00.000Z | deposit    | 417        | 1448                     |
| 120         | 2020-01-23T00:00:00.000Z | deposit    | 824        | 824                      |
| 120         | 2020-02-09T00:00:00.000Z | withdrawal | 374        | 1198                     |
| 120         | 2020-02-10T00:00:00.000Z | deposit    | 313        | 1511                     |
| 120         | 2020-02-11T00:00:00.000Z | deposit    | 664        | 2175                     |
| 120         | 2020-02-13T00:00:00.000Z | deposit    | 693        | 2868                     |
| 120         | 2020-02-17T00:00:00.000Z | purchase   | 654        | 2214                     |
| 120         | 2020-02-20T00:00:00.000Z | deposit    | 402        | 2616                     |
| 120         | 2020-02-21T00:00:00.000Z | deposit    | 970        | 3586                     |
| 120         | 2020-02-22T00:00:00.000Z | purchase   | 343        | 3243                     |
| 120         | 2020-02-28T00:00:00.000Z | withdrawal | 582        | 3825                     |
| 120         | 2020-03-01T00:00:00.000Z | purchase   | 879        | 2946                     |
| 120         | 2020-03-03T00:00:00.000Z | withdrawal | 418        | 3364                     |
| 120         | 2020-03-11T00:00:00.000Z | purchase   | 685        | 2679                     |
| 120         | 2020-03-20T00:00:00.000Z | purchase   | 145        | 3220                     |
| 120         | 2020-03-20T00:00:00.000Z | withdrawal | 686        | 3220                     |
| 120         | 2020-04-06T00:00:00.000Z | withdrawal | 794        | 4014                     |
| 120         | 2020-04-21T00:00:00.000Z | deposit    | 229        | 4243                     |
| 121         | 2020-01-01T00:00:00.000Z | deposit    | 335        | 335                      |
| 121         | 2020-01-20T00:00:00.000Z | deposit    | 19         | 354                      |
| 121         | 2020-01-22T00:00:00.000Z | deposit    | 864        | 1218                     |
| 121         | 2020-01-28T00:00:00.000Z | deposit    | 774        | 1992                     |
| 121         | 2020-02-04T00:00:00.000Z | deposit    | 328        | 2320                     |
| 121         | 2020-02-15T00:00:00.000Z | purchase   | 711        | 1609                     |
| 121         | 2020-02-20T00:00:00.000Z | purchase   | 543        | 1066                     |
| 121         | 2020-02-29T00:00:00.000Z | deposit    | 230        | 1296                     |
| 121         | 2020-03-06T00:00:00.000Z | withdrawal | 869        | 2165                     |
| 121         | 2020-03-11T00:00:00.000Z | deposit    | 26         | 2191                     |
| 121         | 2020-03-15T00:00:00.000Z | purchase   | 878        | 1313                     |
| 122         | 2020-01-29T00:00:00.000Z | deposit    | 397        | 314                      |
| 122         | 2020-01-29T00:00:00.000Z | purchase   | 83         | 314                      |
| 122         | 2020-02-05T00:00:00.000Z | purchase   | 150        | 164                      |
| 122         | 2020-02-13T00:00:00.000Z | deposit    | 88         | 252                      |
| 122         | 2020-03-18T00:00:00.000Z | deposit    | 290        | 542                      |
| 122         | 2020-03-27T00:00:00.000Z | deposit    | 725        | 1267                     |
| 122         | 2020-03-28T00:00:00.000Z | deposit    | 80         | 1347                     |
| 122         | 2020-04-07T00:00:00.000Z | withdrawal | 135        | 1482                     |
| 122         | 2020-04-09T00:00:00.000Z | deposit    | 992        | 2474                     |
| 122         | 2020-04-11T00:00:00.000Z | withdrawal | 678        | 3152                     |
| 122         | 2020-04-12T00:00:00.000Z | deposit    | 7          | 3159                     |
| 122         | 2020-04-20T00:00:00.000Z | deposit    | 51         | 3210                     |
| 122         | 2020-04-23T00:00:00.000Z | withdrawal | 283        | 3493                     |
| 122         | 2020-04-24T00:00:00.000Z | purchase   | 235        | 3258                     |
| 123         | 2020-01-16T00:00:00.000Z | deposit    | 423        | 423                      |
| 123         | 2020-01-25T00:00:00.000Z | withdrawal | 310        | 733                      |
| 123         | 2020-01-26T00:00:00.000Z | purchase   | 830        | -97                      |
| 123         | 2020-02-09T00:00:00.000Z | purchase   | 600        | -697                     |
| 123         | 2020-02-19T00:00:00.000Z | withdrawal | 960        | 263                      |
| 123         | 2020-03-07T00:00:00.000Z | purchase   | 386        | -123                     |
| 123         | 2020-03-28T00:00:00.000Z | deposit    | 352        | 229                      |
| 123         | 2020-03-29T00:00:00.000Z | deposit    | 727        | 956                      |
| 123         | 2020-04-03T00:00:00.000Z | deposit    | 540        | 1496                     |
| 123         | 2020-04-04T00:00:00.000Z | withdrawal | 362        | 1858                     |
| 123         | 2020-04-05T00:00:00.000Z | deposit    | 688        | 2546                     |
| 123         | 2020-04-06T00:00:00.000Z | purchase   | 947        | 1599                     |
| 123         | 2020-04-07T00:00:00.000Z | purchase   | 463        | 1136                     |
| 124         | 2020-01-01T00:00:00.000Z | deposit    | 159        | 159                      |
| 124         | 2020-01-11T00:00:00.000Z | withdrawal | 37         | 196                      |
| 124         | 2020-01-14T00:00:00.000Z | deposit    | 564        | 1339                     |
| 124         | 2020-01-14T00:00:00.000Z | deposit    | 579        | 1339                     |
| 124         | 2020-01-16T00:00:00.000Z | withdrawal | 249        | 1588                     |
| 124         | 2020-01-19T00:00:00.000Z | withdrawal | 285        | 1873                     |
| 124         | 2020-02-03T00:00:00.000Z | withdrawal | 427        | 2300                     |
| 124         | 2020-02-07T00:00:00.000Z | deposit    | 710        | 3010                     |
| 124         | 2020-02-09T00:00:00.000Z | deposit    | 162        | 3172                     |
| 124         | 2020-02-11T00:00:00.000Z | deposit    | 273        | 3445                     |
| 124         | 2020-02-26T00:00:00.000Z | deposit    | 429        | 3874                     |
| 124         | 2020-03-09T00:00:00.000Z | purchase   | 249        | 3625                     |
| 124         | 2020-03-12T00:00:00.000Z | withdrawal | 697        | 4322                     |
| 124         | 2020-03-15T00:00:00.000Z | deposit    | 326        | 4648                     |
| 124         | 2020-03-16T00:00:00.000Z | deposit    | 874        | 5522                     |
| 124         | 2020-03-22T00:00:00.000Z | withdrawal | 705        | 6055                     |
| 124         | 2020-03-22T00:00:00.000Z | purchase   | 172        | 6055                     |
| 124         | 2020-03-28T00:00:00.000Z | deposit    | 46         | 6101                     |
| 125         | 2020-01-04T00:00:00.000Z | deposit    | 637        | 637                      |
| 125         | 2020-01-19T00:00:00.000Z | withdrawal | 506        | 1143                     |
| 125         | 2020-01-28T00:00:00.000Z | withdrawal | 922        | 2065                     |
| 125         | 2020-02-15T00:00:00.000Z | purchase   | 939        | 1126                     |
| 125         | 2020-02-16T00:00:00.000Z | deposit    | 867        | 1993                     |
| 125         | 2020-02-17T00:00:00.000Z | purchase   | 982        | 1011                     |
| 125         | 2020-02-26T00:00:00.000Z | purchase   | 285        | 726                      |
| 125         | 2020-02-29T00:00:00.000Z | purchase   | 349        | 377                      |
| 125         | 2020-03-18T00:00:00.000Z | withdrawal | 65         | 442                      |
| 125         | 2020-03-19T00:00:00.000Z | deposit    | 410        | 852                      |
| 125         | 2020-03-23T00:00:00.000Z | deposit    | 86         | 938                      |
| 125         | 2020-03-30T00:00:00.000Z | deposit    | 558        | 550                      |
| 125         | 2020-03-30T00:00:00.000Z | purchase   | 946        | 550                      |
| 126         | 2020-01-21T00:00:00.000Z | deposit    | 120        | 1026                     |
| 126         | 2020-01-21T00:00:00.000Z | withdrawal | 906        | 1026                     |
| 126         | 2020-02-04T00:00:00.000Z | deposit    | 394        | 1420                     |
| 126         | 2020-02-07T00:00:00.000Z | purchase   | 875        | 545                      |
| 126         | 2020-02-10T00:00:00.000Z | deposit    | 970        | 1515                     |
| 126         | 2020-02-11T00:00:00.000Z | withdrawal | 806        | 2321                     |
| 126         | 2020-02-13T00:00:00.000Z | purchase   | 167        | 2154                     |
| 126         | 2020-02-22T00:00:00.000Z | deposit    | 280        | 2434                     |
| 126         | 2020-02-23T00:00:00.000Z | purchase   | 744        | 1690                     |
| 126         | 2020-02-25T00:00:00.000Z | deposit    | 651        | 2341                     |
| 126         | 2020-02-27T00:00:00.000Z | deposit    | 367        | 2708                     |
| 126         | 2020-03-03T00:00:00.000Z | deposit    | 270        | 3851                     |
| 126         | 2020-03-03T00:00:00.000Z | withdrawal | 873        | 3851                     |
| 126         | 2020-03-24T00:00:00.000Z | withdrawal | 946        | 4797                     |
| 126         | 2020-03-28T00:00:00.000Z | withdrawal | 557        | 5354                     |
| 127         | 2020-01-17T00:00:00.000Z | deposit    | 217        | 217                      |
| 127         | 2020-02-01T00:00:00.000Z | deposit    | 486        | 703                      |
| 127         | 2020-04-01T00:00:00.000Z | deposit    | 969        | 1672                     |
| 128         | 2020-01-26T00:00:00.000Z | deposit    | 410        | 410                      |
| 128         | 2020-02-04T00:00:00.000Z | deposit    | 472        | 882                      |
| 128         | 2020-02-11T00:00:00.000Z | purchase   | 246        | 636                      |
| 128         | 2020-02-29T00:00:00.000Z | withdrawal | 492        | 1128                     |
| 128         | 2020-03-07T00:00:00.000Z | purchase   | 319        | 809                      |
| 128         | 2020-03-21T00:00:00.000Z | purchase   | 601        | 208                      |
| 128         | 2020-04-06T00:00:00.000Z | purchase   | 321        | -113                     |
| 128         | 2020-04-16T00:00:00.000Z | deposit    | 895        | 782                      |
| 129         | 2020-01-12T00:00:00.000Z | deposit    | 568        | 568                      |
| 129         | 2020-01-27T00:00:00.000Z | withdrawal | 508        | 1076                     |
| 129         | 2020-01-31T00:00:00.000Z | deposit    | 406        | 1482                     |
| 129         | 2020-02-09T00:00:00.000Z | withdrawal | 376        | 1858                     |
| 129         | 2020-02-11T00:00:00.000Z | withdrawal | 359        | 2217                     |
| 129         | 2020-02-12T00:00:00.000Z | withdrawal | 23         | 2240                     |
| 129         | 2020-02-15T00:00:00.000Z | deposit    | 482        | 2722                     |
| 129         | 2020-02-24T00:00:00.000Z | purchase   | 986        | 1736                     |
| 129         | 2020-03-06T00:00:00.000Z | purchase   | 154        | 1582                     |
| 129         | 2020-03-17T00:00:00.000Z | deposit    | 669        | 2251                     |
| 129         | 2020-03-28T00:00:00.000Z | deposit    | 349        | 2600                     |
| 129         | 2020-04-01T00:00:00.000Z | withdrawal | 593        | 3193                     |
| 129         | 2020-04-05T00:00:00.000Z | withdrawal | 867        | 4060                     |
| 129         | 2020-04-07T00:00:00.000Z | purchase   | 615        | 3445                     |
| 130         | 2020-01-02T00:00:00.000Z | deposit    | 557        | 557                      |
| 130         | 2020-01-07T00:00:00.000Z | withdrawal | 106        | 663                      |
| 130         | 2020-01-11T00:00:00.000Z | withdrawal | 895        | 1558                     |
| 130         | 2020-01-19T00:00:00.000Z | deposit    | 196        | 1754                     |
| 130         | 2020-02-05T00:00:00.000Z | withdrawal | 488        | 2313                     |
| 130         | 2020-02-05T00:00:00.000Z | withdrawal | 71         | 2313                     |
| 130         | 2020-02-15T00:00:00.000Z | purchase   | 353        | 1960                     |
| 130         | 2020-03-01T00:00:00.000Z | purchase   | 971        | 989                      |
| 130         | 2020-03-04T00:00:00.000Z | deposit    | 646        | 1635                     |
| 130         | 2020-03-13T00:00:00.000Z | deposit    | 753        | 2388                     |
| 130         | 2020-03-27T00:00:00.000Z | deposit    | 864        | 3252                     |
| 131         | 2020-01-10T00:00:00.000Z | purchase   | 846        | 86                       |
| 131         | 2020-01-10T00:00:00.000Z | deposit    | 932        | 86                       |
| 131         | 2020-01-14T00:00:00.000Z | deposit    | 803        | 889                      |
| 131         | 2020-01-20T00:00:00.000Z | withdrawal | 892        | 1781                     |
| 131         | 2020-01-21T00:00:00.000Z | deposit    | 868        | 2649                     |
| 131         | 2020-01-29T00:00:00.000Z | deposit    | 465        | 3114                     |
| 131         | 2020-01-31T00:00:00.000Z | withdrawal | 850        | 3964                     |
| 131         | 2020-02-02T00:00:00.000Z | purchase   | 62         | 3902                     |
| 131         | 2020-02-08T00:00:00.000Z | purchase   | 955        | 2947                     |
| 131         | 2020-02-10T00:00:00.000Z | purchase   | 247        | 2700                     |
| 131         | 2020-02-14T00:00:00.000Z | withdrawal | 43         | 2743                     |
| 131         | 2020-02-19T00:00:00.000Z | deposit    | 98         | 2841                     |
| 131         | 2020-02-25T00:00:00.000Z | purchase   | 973        | 1868                     |
| 131         | 2020-02-27T00:00:00.000Z | deposit    | 719        | 2587                     |
| 131         | 2020-03-14T00:00:00.000Z | deposit    | 181        | 2768                     |
| 131         | 2020-03-15T00:00:00.000Z | deposit    | 672        | 3440                     |
| 131         | 2020-03-16T00:00:00.000Z | withdrawal | 707        | 4147                     |
| 131         | 2020-03-21T00:00:00.000Z | deposit    | 263        | 4410                     |
| 131         | 2020-03-22T00:00:00.000Z | deposit    | 711        | 5121                     |
| 131         | 2020-03-27T00:00:00.000Z | purchase   | 617        | 4504                     |
| 131         | 2020-03-28T00:00:00.000Z | purchase   | 16         | 4488                     |
| 131         | 2020-03-29T00:00:00.000Z | deposit    | 344        | 4832                     |
| 132         | 2020-01-10T00:00:00.000Z | deposit    | 14         | 14                       |
| 132         | 2020-01-20T00:00:00.000Z | purchase   | 427        | -413                     |
| 132         | 2020-01-30T00:00:00.000Z | withdrawal | 841        | 428                      |
| 132         | 2020-02-06T00:00:00.000Z | withdrawal | 592        | 1020                     |
| 132         | 2020-02-07T00:00:00.000Z | purchase   | 998        | 22                       |
| 132         | 2020-03-05T00:00:00.000Z | purchase   | 736        | -714                     |
| 132         | 2020-03-20T00:00:00.000Z | withdrawal | 377        | -337                     |
| 132         | 2020-03-26T00:00:00.000Z | withdrawal | 356        | 19                       |
| 132         | 2020-03-30T00:00:00.000Z | purchase   | 943        | -924                     |
| 132         | 2020-04-08T00:00:00.000Z | purchase   | 329        | -1253                    |
| 133         | 2020-01-10T00:00:00.000Z | deposit    | 279        | 279                      |
| 133         | 2020-01-23T00:00:00.000Z | withdrawal | 635        | 914                      |
| 133         | 2020-02-26T00:00:00.000Z | purchase   | 12         | 902                      |
| 134         | 2020-01-08T00:00:00.000Z | deposit    | 358        | 358                      |
| 134         | 2020-01-11T00:00:00.000Z | deposit    | 650        | 1008                     |
| 134         | 2020-01-16T00:00:00.000Z | deposit    | 911        | 1919                     |
| 134         | 2020-01-25T00:00:00.000Z | deposit    | 980        | 2899                     |
| 134         | 2020-01-26T00:00:00.000Z | deposit    | 496        | 3194                     |
| 134         | 2020-01-26T00:00:00.000Z | purchase   | 201        | 3194                     |
| 134         | 2020-02-05T00:00:00.000Z | withdrawal | 136        | 3330                     |
| 134         | 2020-02-07T00:00:00.000Z | deposit    | 135        | 3465                     |
| 134         | 2020-02-14T00:00:00.000Z | purchase   | 189        | 3276                     |
| 134         | 2020-02-19T00:00:00.000Z | withdrawal | 670        | 3946                     |
| 134         | 2020-02-26T00:00:00.000Z | withdrawal | 102        | 4048                     |
| 134         | 2020-02-27T00:00:00.000Z | deposit    | 579        | 4627                     |
| 134         | 2020-02-29T00:00:00.000Z | purchase   | 63         | 4564                     |
| 134         | 2020-03-09T00:00:00.000Z | purchase   | 339        | 4225                     |
| 134         | 2020-03-16T00:00:00.000Z | withdrawal | 841        | 5066                     |
| 134         | 2020-03-20T00:00:00.000Z | deposit    | 328        | 5394                     |
| 134         | 2020-03-23T00:00:00.000Z | deposit    | 155        | 5549                     |
| 134         | 2020-03-27T00:00:00.000Z | withdrawal | 283        | 5832                     |
| 135         | 2020-01-09T00:00:00.000Z | deposit    | 949        | 949                      |
| 135         | 2020-01-22T00:00:00.000Z | withdrawal | 14         | 963                      |
| 135         | 2020-01-30T00:00:00.000Z | withdrawal | 831        | 1794                     |
| 135         | 2020-02-11T00:00:00.000Z | deposit    | 491        | 2285                     |
| 135         | 2020-02-14T00:00:00.000Z | deposit    | 470        | 2755                     |
| 135         | 2020-02-16T00:00:00.000Z | deposit    | 834        | 3589                     |
| 135         | 2020-02-21T00:00:00.000Z | purchase   | 78         | 3511                     |
| 135         | 2020-02-22T00:00:00.000Z | withdrawal | 375        | 3886                     |
| 135         | 2020-02-27T00:00:00.000Z | purchase   | 469        | 3417                     |
| 135         | 2020-03-09T00:00:00.000Z | withdrawal | 178        | 3595                     |
| 135         | 2020-03-23T00:00:00.000Z | deposit    | 202        | 3797                     |
| 136         | 2020-01-11T00:00:00.000Z | deposit    | 882        | 882                      |
| 136         | 2020-01-12T00:00:00.000Z | deposit    | 19         | 901                      |
| 136         | 2020-01-25T00:00:00.000Z | withdrawal | 653        | 1554                     |
| 136         | 2020-01-28T00:00:00.000Z | deposit    | 455        | 2009                     |
| 136         | 2020-01-29T00:00:00.000Z | withdrawal | 224        | 2233                     |
| 136         | 2020-02-27T00:00:00.000Z | deposit    | 487        | 2720                     |
| 136         | 2020-03-06T00:00:00.000Z | withdrawal | 116        | 2836                     |
| 136         | 2020-03-11T00:00:00.000Z | deposit    | 53         | 2889                     |
| 136         | 2020-03-24T00:00:00.000Z | withdrawal | 623        | 3512                     |
| 136         | 2020-03-26T00:00:00.000Z | deposit    | 103        | 3615                     |
| 136         | 2020-04-02T00:00:00.000Z | deposit    | 194        | 3809                     |
| 136         | 2020-04-09T00:00:00.000Z | purchase   | 710        | 3099                     |
| 137         | 2020-01-06T00:00:00.000Z | deposit    | 881        | 881                      |
| 137         | 2020-01-20T00:00:00.000Z | purchase   | 403        | 478                      |
| 137         | 2020-01-23T00:00:00.000Z | purchase   | 82         | 396                      |
| 137         | 2020-02-16T00:00:00.000Z | purchase   | 752        | -356                     |
| 138         | 2020-01-11T00:00:00.000Z | deposit    | 520        | 520                      |
| 138         | 2020-01-23T00:00:00.000Z | deposit    | 758        | 1278                     |
| 138         | 2020-01-31T00:00:00.000Z | deposit    | 38         | 1316                     |
| 138         | 2020-02-01T00:00:00.000Z | deposit    | 819        | 2135                     |
| 138         | 2020-02-03T00:00:00.000Z | withdrawal | 954        | 3089                     |
| 138         | 2020-02-05T00:00:00.000Z | purchase   | 485        | 2604                     |
| 138         | 2020-02-07T00:00:00.000Z | deposit    | 604        | 3208                     |
| 138         | 2020-02-13T00:00:00.000Z | deposit    | 42         | 3250                     |
| 138         | 2020-02-24T00:00:00.000Z | withdrawal | 958        | 4208                     |
| 138         | 2020-02-29T00:00:00.000Z | purchase   | 64         | 4144                     |
| 138         | 2020-03-20T00:00:00.000Z | withdrawal | 129        | 4273                     |
| 138         | 2020-03-22T00:00:00.000Z | purchase   | 750        | 3523                     |
| 138         | 2020-03-24T00:00:00.000Z | deposit    | 619        | 4142                     |
| 138         | 2020-03-29T00:00:00.000Z | deposit    | 15         | 4157                     |
| 138         | 2020-04-06T00:00:00.000Z | purchase   | 850        | 3307                     |
| 139         | 2020-01-10T00:00:00.000Z | deposit    | 653        | 653                      |
| 139         | 2020-01-17T00:00:00.000Z | purchase   | 370        | 283                      |
| 139         | 2020-01-18T00:00:00.000Z | withdrawal | 353        | 636                      |
| 139         | 2020-01-23T00:00:00.000Z | purchase   | 180        | 456                      |
| 139         | 2020-01-26T00:00:00.000Z | purchase   | 95         | 361                      |
| 139         | 2020-01-31T00:00:00.000Z | deposit    | 389        | 750                      |
| 139         | 2020-02-04T00:00:00.000Z | deposit    | 460        | 1210                     |
| 139         | 2020-03-01T00:00:00.000Z | withdrawal | 613        | 1823                     |
| 139         | 2020-03-02T00:00:00.000Z | deposit    | 418        | 2241                     |
| 139         | 2020-03-03T00:00:00.000Z | withdrawal | 442        | 2683                     |
| 139         | 2020-03-04T00:00:00.000Z | deposit    | 830        | 3513                     |
| 139         | 2020-03-07T00:00:00.000Z | withdrawal | 983        | 4496                     |
| 139         | 2020-03-10T00:00:00.000Z | deposit    | 951        | 5447                     |
| 139         | 2020-03-14T00:00:00.000Z | deposit    | 562        | 6009                     |
| 139         | 2020-03-28T00:00:00.000Z | withdrawal | 690        | 6699                     |
| 140         | 2020-01-26T00:00:00.000Z | deposit    | 138        | 803                      |
| 140         | 2020-01-26T00:00:00.000Z | deposit    | 665        | 803                      |
| 140         | 2020-02-01T00:00:00.000Z | deposit    | 180        | 983                      |
| 140         | 2020-02-13T00:00:00.000Z | deposit    | 543        | 1526                     |
| 140         | 2020-03-05T00:00:00.000Z | withdrawal | 339        | 1865                     |
| 140         | 2020-03-21T00:00:00.000Z | purchase   | 11         | 1854                     |
| 140         | 2020-03-22T00:00:00.000Z | withdrawal | 656        | 2510                     |
| 140         | 2020-03-26T00:00:00.000Z | deposit    | 995        | 3505                     |
| 140         | 2020-03-28T00:00:00.000Z | deposit    | 830        | 4335                     |
| 140         | 2020-04-02T00:00:00.000Z | purchase   | 127        | 4208                     |
| 140         | 2020-04-06T00:00:00.000Z | withdrawal | 877        | 5085                     |
| 140         | 2020-04-09T00:00:00.000Z | deposit    | 590        | 5675                     |
| 140         | 2020-04-13T00:00:00.000Z | withdrawal | 647        | 6322                     |
| 140         | 2020-04-16T00:00:00.000Z | withdrawal | 336        | 6658                     |
| 140         | 2020-04-18T00:00:00.000Z | purchase   | 986        | 5672                     |
| 140         | 2020-04-19T00:00:00.000Z | deposit    | 993        | 6665                     |
| 140         | 2020-04-22T00:00:00.000Z | deposit    | 540        | 7205                     |
| 141         | 2020-01-15T00:00:00.000Z | deposit    | 934        | 934                      |
| 141         | 2020-01-20T00:00:00.000Z | purchase   | 320        | 614                      |
| 141         | 2020-01-22T00:00:00.000Z | purchase   | 983        | -369                     |
| 141         | 2020-02-03T00:00:00.000Z | deposit    | 588        | 219                      |
| 141         | 2020-02-06T00:00:00.000Z | deposit    | 50         | 269                      |
| 141         | 2020-02-28T00:00:00.000Z | deposit    | 830        | 1099                     |
| 141         | 2020-02-29T00:00:00.000Z | deposit    | 384        | 1483                     |
| 141         | 2020-03-19T00:00:00.000Z | deposit    | 630        | 2113                     |
| 141         | 2020-04-04T00:00:00.000Z | deposit    | 425        | 2538                     |
| 142         | 2020-01-16T00:00:00.000Z | deposit    | 517        | 517                      |
| 142         | 2020-01-27T00:00:00.000Z | deposit    | 861        | 1378                     |
| 142         | 2020-02-10T00:00:00.000Z | withdrawal | 441        | 1819                     |
| 142         | 2020-02-19T00:00:00.000Z | purchase   | 497        | 1322                     |
| 142         | 2020-03-04T00:00:00.000Z | withdrawal | 323        | 1645                     |
| 142         | 2020-03-08T00:00:00.000Z | deposit    | 55         | 1700                     |
| 142         | 2020-03-11T00:00:00.000Z | deposit    | 480        | 2180                     |
| 142         | 2020-03-31T00:00:00.000Z | purchase   | 435        | 1745                     |
| 142         | 2020-04-01T00:00:00.000Z | deposit    | 646        | 2391                     |
| 143         | 2020-01-29T00:00:00.000Z | deposit    | 807        | 807                      |
| 143         | 2020-02-01T00:00:00.000Z | deposit    | 483        | 1290                     |
| 143         | 2020-02-04T00:00:00.000Z | purchase   | 343        | 947                      |
| 143         | 2020-02-20T00:00:00.000Z | deposit    | 602        | 1549                     |
| 143         | 2020-02-29T00:00:00.000Z | deposit    | 76         | 1625                     |
| 143         | 2020-03-04T00:00:00.000Z | deposit    | 24         | 1649                     |
| 143         | 2020-03-07T00:00:00.000Z | withdrawal | 574        | 2223                     |
| 143         | 2020-03-15T00:00:00.000Z | purchase   | 494        | 1729                     |
| 143         | 2020-03-25T00:00:00.000Z | purchase   | 555        | 1174                     |
| 143         | 2020-04-02T00:00:00.000Z | withdrawal | 561        | 1735                     |
| 143         | 2020-04-09T00:00:00.000Z | deposit    | 295        | 2030                     |
| 143         | 2020-04-19T00:00:00.000Z | purchase   | 333        | 1697                     |
| 143         | 2020-04-21T00:00:00.000Z | purchase   | 957        | 740                      |
| 143         | 2020-04-22T00:00:00.000Z | deposit    | 445        | 1185                     |
| 143         | 2020-04-23T00:00:00.000Z | purchase   | 823        | 362                      |
| 143         | 2020-04-24T00:00:00.000Z | withdrawal | 549        | 911                      |
| 144         | 2020-01-14T00:00:00.000Z | deposit    | 559        | 559                      |
| 144         | 2020-01-17T00:00:00.000Z | withdrawal | 622        | 1181                     |
| 144         | 2020-01-22T00:00:00.000Z | withdrawal | 672        | 1853                     |
| 144         | 2020-02-07T00:00:00.000Z | purchase   | 315        | 1538                     |
| 144         | 2020-02-18T00:00:00.000Z | withdrawal | 725        | 2263                     |
| 144         | 2020-02-22T00:00:00.000Z | purchase   | 558        | 758                      |
| 144         | 2020-02-22T00:00:00.000Z | purchase   | 947        | 758                      |
| 144         | 2020-03-20T00:00:00.000Z | withdrawal | 118        | 876                      |
| 144         | 2020-03-24T00:00:00.000Z | deposit    | 316        | 1192                     |
| 144         | 2020-03-31T00:00:00.000Z | deposit    | 36         | 1228                     |
| 144         | 2020-04-02T00:00:00.000Z | purchase   | 763        | 465                      |
| 144         | 2020-04-05T00:00:00.000Z | deposit    | 104        | 569                      |
| 144         | 2020-04-07T00:00:00.000Z | deposit    | 479        | 537                      |
| 144         | 2020-04-07T00:00:00.000Z | purchase   | 955        | 537                      |
| 144         | 2020-04-07T00:00:00.000Z | withdrawal | 444        | 537                      |
| 144         | 2020-04-10T00:00:00.000Z | deposit    | 230        | 767                      |
| 145         | 2020-01-02T00:00:00.000Z | deposit    | 365        | 365                      |
| 145         | 2020-01-06T00:00:00.000Z | withdrawal | 372        | 737                      |
| 145         | 2020-01-07T00:00:00.000Z | purchase   | 585        | 158                      |
| 145         | 2020-01-07T00:00:00.000Z | withdrawal | 6          | 158                      |
| 145         | 2020-01-08T00:00:00.000Z | purchase   | 972        | -814                     |
| 145         | 2020-01-13T00:00:00.000Z | withdrawal | 373        | -441                     |
| 145         | 2020-01-19T00:00:00.000Z | purchase   | 112        | -553                     |
| 145         | 2020-01-27T00:00:00.000Z | withdrawal | 996        | 443                      |
| 145         | 2020-02-01T00:00:00.000Z | withdrawal | 54         | 497                      |
| 145         | 2020-02-11T00:00:00.000Z | withdrawal | 283        | 780                      |
| 145         | 2020-02-15T00:00:00.000Z | purchase   | 980        | 721                      |
| 145         | 2020-02-15T00:00:00.000Z | deposit    | 921        | 721                      |
| 145         | 2020-02-19T00:00:00.000Z | deposit    | 753        | 1474                     |
| 145         | 2020-02-23T00:00:00.000Z | deposit    | 724        | 2198                     |
| 145         | 2020-03-02T00:00:00.000Z | withdrawal | 776        | 2974                     |
| 145         | 2020-03-03T00:00:00.000Z | purchase   | 890        | 2084                     |
| 145         | 2020-03-12T00:00:00.000Z | purchase   | 998        | 1086                     |
| 145         | 2020-03-24T00:00:00.000Z | deposit    | 515        | 1601                     |
| 146         | 2020-01-05T00:00:00.000Z | deposit    | 657        | 657                      |
| 146         | 2020-01-16T00:00:00.000Z | withdrawal | 266        | 923                      |
| 146         | 2020-01-22T00:00:00.000Z | purchase   | 822        | 101                      |
| 146         | 2020-01-27T00:00:00.000Z | withdrawal | 873        | 974                      |
| 146         | 2020-01-30T00:00:00.000Z | deposit    | 497        | 1471                     |
| 146         | 2020-02-06T00:00:00.000Z | purchase   | 349        | 1122                     |
| 146         | 2020-02-15T00:00:00.000Z | purchase   | 950        | 172                      |
| 146         | 2020-02-17T00:00:00.000Z | purchase   | 225        | -53                      |
| 146         | 2020-02-22T00:00:00.000Z | purchase   | 936        | -989                     |
| 146         | 2020-03-03T00:00:00.000Z | withdrawal | 569        | -420                     |
| 146         | 2020-03-14T00:00:00.000Z | withdrawal | 315        | -105                     |
| 146         | 2020-03-20T00:00:00.000Z | withdrawal | 617        | 512                      |
| 146         | 2020-03-29T00:00:00.000Z | deposit    | 987        | 1499                     |
| 146         | 2020-04-03T00:00:00.000Z | deposit    | 64         | 1563                     |
| 147         | 2020-01-15T00:00:00.000Z | deposit    | 767        | 934                      |
| 147         | 2020-01-15T00:00:00.000Z | withdrawal | 167        | 934                      |
| 147         | 2020-02-08T00:00:00.000Z | deposit    | 888        | 1822                     |
| 147         | 2020-02-25T00:00:00.000Z | deposit    | 210        | 2032                     |
| 148         | 2020-01-12T00:00:00.000Z | deposit    | 88         | 88                       |
| 148         | 2020-02-09T00:00:00.000Z | purchase   | 941        | -853                     |
| 148         | 2020-02-13T00:00:00.000Z | purchase   | 826        | -1679                    |
| 148         | 2020-02-17T00:00:00.000Z | withdrawal | 788        | -891                     |
| 148         | 2020-03-17T00:00:00.000Z | withdrawal | 348        | -543                     |
| 148         | 2020-03-28T00:00:00.000Z | deposit    | 739        | 196                      |
| 148         | 2020-04-03T00:00:00.000Z | purchase   | 113        | 83                       |
| 148         | 2020-04-08T00:00:00.000Z | purchase   | 541        | -458                     |
| 149         | 2020-01-13T00:00:00.000Z | deposit    | 831        | 831                      |
| 149         | 2020-01-26T00:00:00.000Z | purchase   | 985        | -154                     |
| 149         | 2020-01-30T00:00:00.000Z | deposit    | 498        | 344                      |
| 149         | 2020-02-28T00:00:00.000Z | purchase   | 23         | 321                      |
| 149         | 2020-03-02T00:00:00.000Z | deposit    | 732        | 1053                     |
| 149         | 2020-03-11T00:00:00.000Z | withdrawal | 520        | 1603                     |
| 149         | 2020-03-11T00:00:00.000Z | deposit    | 30         | 1603                     |
| 149         | 2020-03-15T00:00:00.000Z | deposit    | 822        | 2425                     |
| 149         | 2020-03-18T00:00:00.000Z | withdrawal | 825        | 3250                     |
| 149         | 2020-03-19T00:00:00.000Z | withdrawal | 791        | 4041                     |
| 149         | 2020-03-24T00:00:00.000Z | deposit    | 15         | 4056                     |
| 149         | 2020-03-27T00:00:00.000Z | deposit    | 14         | 4070                     |
| 150         | 2020-01-04T00:00:00.000Z | deposit    | 69         | 69                       |
| 150         | 2020-01-05T00:00:00.000Z | withdrawal | 715        | 784                      |
| 150         | 2020-01-15T00:00:00.000Z | withdrawal | 869        | 1653                     |
| 150         | 2020-01-18T00:00:00.000Z | withdrawal | 176        | 1829                     |
| 150         | 2020-01-22T00:00:00.000Z | deposit    | 166        | 1995                     |
| 150         | 2020-01-27T00:00:00.000Z | deposit    | 925        | 2920                     |
| 150         | 2020-02-03T00:00:00.000Z | deposit    | 63         | 2983                     |
| 150         | 2020-02-09T00:00:00.000Z | purchase   | 546        | 2437                     |
| 150         | 2020-02-12T00:00:00.000Z | purchase   | 371        | 2066                     |
| 150         | 2020-02-19T00:00:00.000Z | purchase   | 264        | 1802                     |
| 150         | 2020-02-28T00:00:00.000Z | deposit    | 206        | 2008                     |
| 150         | 2020-03-20T00:00:00.000Z | deposit    | 715        | 2723                     |
| 150         | 2020-03-24T00:00:00.000Z | withdrawal | 807        | 3530                     |
| 150         | 2020-04-01T00:00:00.000Z | withdrawal | 825        | 4355                     |
| 151         | 2020-01-10T00:00:00.000Z | deposit    | 58         | 58                       |
| 151         | 2020-01-21T00:00:00.000Z | deposit    | 387        | 445                      |
| 151         | 2020-01-23T00:00:00.000Z | deposit    | 922        | 1367                     |
| 151         | 2020-02-03T00:00:00.000Z | purchase   | 640        | 727                      |
| 151         | 2020-02-24T00:00:00.000Z | withdrawal | 722        | 1449                     |
| 151         | 2020-03-18T00:00:00.000Z | deposit    | 169        | 1618                     |
| 151         | 2020-03-20T00:00:00.000Z | purchase   | 428        | 1190                     |
| 151         | 2020-03-26T00:00:00.000Z | deposit    | 318        | 1508                     |
| 151         | 2020-03-29T00:00:00.000Z | withdrawal | 951        | 2459                     |
| 152         | 2020-01-01T00:00:00.000Z | deposit    | 917        | 917                      |
| 152         | 2020-01-16T00:00:00.000Z | deposit    | 340        | 1257                     |
| 152         | 2020-01-17T00:00:00.000Z | deposit    | 264        | 1521                     |
| 152         | 2020-01-23T00:00:00.000Z | deposit    | 310        | 1831                     |
| 152         | 2020-02-04T00:00:00.000Z | deposit    | 706        | 3233                     |
| 152         | 2020-02-04T00:00:00.000Z | deposit    | 696        | 3233                     |
| 152         | 2020-02-09T00:00:00.000Z | withdrawal | 849        | 4082                     |
| 152         | 2020-02-13T00:00:00.000Z | purchase   | 334        | 3748                     |
| 152         | 2020-02-15T00:00:00.000Z | deposit    | 812        | 4560                     |
| 152         | 2020-02-22T00:00:00.000Z | purchase   | 960        | 3600                     |
| 152         | 2020-03-20T00:00:00.000Z | deposit    | 68         | 3668                     |
| 152         | 2020-03-28T00:00:00.000Z | deposit    | 14         | 3682                     |
| 153         | 2020-01-18T00:00:00.000Z | deposit    | 754        | 754                      |
| 153         | 2020-01-22T00:00:00.000Z | purchase   | 987        | 354                      |
| 153         | 2020-01-22T00:00:00.000Z | withdrawal | 587        | 354                      |
| 153         | 2020-01-23T00:00:00.000Z | withdrawal | 431        | 785                      |
| 153         | 2020-01-26T00:00:00.000Z | withdrawal | 703        | 1488                     |
| 153         | 2020-02-01T00:00:00.000Z | purchase   | 302        | 1186                     |
| 153         | 2020-02-06T00:00:00.000Z | withdrawal | 181        | 1367                     |
| 153         | 2020-02-07T00:00:00.000Z | deposit    | 664        | 2031                     |
| 153         | 2020-02-08T00:00:00.000Z | purchase   | 578        | 1453                     |
| 153         | 2020-02-15T00:00:00.000Z | deposit    | 752        | 2205                     |
| 153         | 2020-02-20T00:00:00.000Z | deposit    | 959        | 3164                     |
| 153         | 2020-02-24T00:00:00.000Z | deposit    | 353        | 3517                     |
| 153         | 2020-02-25T00:00:00.000Z | withdrawal | 107        | 3624                     |
| 153         | 2020-02-26T00:00:00.000Z | purchase   | 382        | 3242                     |
| 153         | 2020-03-07T00:00:00.000Z | purchase   | 683        | 2559                     |
| 153         | 2020-03-10T00:00:00.000Z | deposit    | 378        | 2937                     |
| 153         | 2020-03-21T00:00:00.000Z | purchase   | 274        | 2663                     |
| 153         | 2020-03-23T00:00:00.000Z | deposit    | 683        | 3346                     |
| 153         | 2020-03-27T00:00:00.000Z | purchase   | 178        | 3168                     |
| 153         | 2020-03-31T00:00:00.000Z | purchase   | 845        | 2323                     |
| 154         | 2020-01-15T00:00:00.000Z | deposit    | 120        | -681                     |
| 154         | 2020-01-15T00:00:00.000Z | purchase   | 801        | -681                     |
| 154         | 2020-01-28T00:00:00.000Z | withdrawal | 447        | -234                     |
| 154         | 2020-01-31T00:00:00.000Z | purchase   | 994        | -498                     |
| 154         | 2020-01-31T00:00:00.000Z | deposit    | 730        | -498                     |
| 154         | 2020-02-07T00:00:00.000Z | withdrawal | 13         | 453                      |
| 154         | 2020-02-07T00:00:00.000Z | deposit    | 938        | 453                      |
| 154         | 2020-02-08T00:00:00.000Z | purchase   | 239        | 214                      |
| 154         | 2020-02-09T00:00:00.000Z | purchase   | 255        | -41                      |
| 154         | 2020-02-13T00:00:00.000Z | withdrawal | 437        | 396                      |
| 154         | 2020-02-19T00:00:00.000Z | deposit    | 66         | 462                      |
| 154         | 2020-02-27T00:00:00.000Z | purchase   | 219        | 243                      |
| 154         | 2020-02-28T00:00:00.000Z | deposit    | 86         | 329                      |
| 154         | 2020-02-29T00:00:00.000Z | withdrawal | 875        | 1204                     |
| 154         | 2020-03-03T00:00:00.000Z | deposit    | 988        | 2192                     |
| 154         | 2020-03-04T00:00:00.000Z | withdrawal | 12         | 2204                     |
| 154         | 2020-03-15T00:00:00.000Z | deposit    | 663        | 2867                     |
| 154         | 2020-03-16T00:00:00.000Z | withdrawal | 988        | 3855                     |
| 154         | 2020-03-19T00:00:00.000Z | withdrawal | 415        | 4270                     |
| 154         | 2020-04-07T00:00:00.000Z | deposit    | 86         | 4356                     |
| 154         | 2020-04-12T00:00:00.000Z | purchase   | 537        | 3819                     |
| 155         | 2020-01-10T00:00:00.000Z | deposit    | 712        | 712                      |
| 155         | 2020-01-19T00:00:00.000Z | purchase   | 360        | 352                      |
| 155         | 2020-01-24T00:00:00.000Z | purchase   | 717        | -365                     |
| 155         | 2020-01-29T00:00:00.000Z | purchase   | 631        | -996                     |
| 155         | 2020-02-04T00:00:00.000Z | purchase   | 295        | -1291                    |
| 155         | 2020-02-15T00:00:00.000Z | withdrawal | 804        | 317                      |
| 155         | 2020-02-15T00:00:00.000Z | deposit    | 804        | 317                      |
| 155         | 2020-02-20T00:00:00.000Z | purchase   | 751        | -434                     |
| 155         | 2020-02-29T00:00:00.000Z | purchase   | 899        | -1333                    |
| 155         | 2020-03-07T00:00:00.000Z | withdrawal | 751        | -582                     |
| 155         | 2020-03-16T00:00:00.000Z | withdrawal | 627        | 45                       |
| 155         | 2020-03-19T00:00:00.000Z | deposit    | 117        | 792                      |
| 155         | 2020-03-19T00:00:00.000Z | deposit    | 630        | 792                      |
| 155         | 2020-03-28T00:00:00.000Z | deposit    | 494        | 1286                     |
| 155         | 2020-03-29T00:00:00.000Z | deposit    | 890        | 2670                     |
| 155         | 2020-03-29T00:00:00.000Z | withdrawal | 494        | 2670                     |
| 155         | 2020-03-30T00:00:00.000Z | withdrawal | 595        | 3265                     |
| 155         | 2020-03-31T00:00:00.000Z | withdrawal | 100        | 3365                     |
| 155         | 2020-04-04T00:00:00.000Z | purchase   | 501        | 2864                     |
| 155         | 2020-04-05T00:00:00.000Z | withdrawal | 652        | 3516                     |
| 156         | 2020-01-24T00:00:00.000Z | deposit    | 82         | 82                       |
| 156         | 2020-04-08T00:00:00.000Z | deposit    | 230        | 312                      |
| 157         | 2020-01-06T00:00:00.000Z | deposit    | 721        | 721                      |
| 157         | 2020-01-28T00:00:00.000Z | purchase   | 583        | 138                      |
| 157         | 2020-02-29T00:00:00.000Z | withdrawal | 749        | 887                      |
| 157         | 2020-03-01T00:00:00.000Z | deposit    | 941        | 1828                     |
| 157         | 2020-03-06T00:00:00.000Z | deposit    | 517        | 2345                     |
| 157         | 2020-03-09T00:00:00.000Z | deposit    | 395        | 2740                     |
| 157         | 2020-03-14T00:00:00.000Z | deposit    | 697        | 3437                     |
| 157         | 2020-03-18T00:00:00.000Z | deposit    | 827        | 4264                     |
| 158         | 2020-01-18T00:00:00.000Z | purchase   | 109        | 533                      |
| 158         | 2020-01-18T00:00:00.000Z | deposit    | 642        | 533                      |
| 158         | 2020-01-28T00:00:00.000Z | purchase   | 477        | 56                       |
| 158         | 2020-02-08T00:00:00.000Z | purchase   | 192        | -136                     |
| 158         | 2020-03-09T00:00:00.000Z | withdrawal | 799        | 663                      |
| 158         | 2020-03-13T00:00:00.000Z | purchase   | 235        | 428                      |
| 158         | 2020-03-16T00:00:00.000Z | purchase   | 546        | -118                     |
| 158         | 2020-03-19T00:00:00.000Z | deposit    | 567        | 449                      |
| 158         | 2020-03-23T00:00:00.000Z | deposit    | 683        | 1132                     |
| 158         | 2020-03-27T00:00:00.000Z | withdrawal | 118        | 1250                     |
| 158         | 2020-03-29T00:00:00.000Z | purchase   | 522        | 728                      |
| 159         | 2020-01-04T00:00:00.000Z | deposit    | 669        | 669                      |
| 159         | 2020-01-06T00:00:00.000Z | purchase   | 236        | 433                      |
| 159         | 2020-01-16T00:00:00.000Z | withdrawal | 734        | 1167                     |
| 160         | 2020-01-17T00:00:00.000Z | deposit    | 843        | 843                      |
| 160         | 2020-02-04T00:00:00.000Z | deposit    | 734        | 1577                     |
| 160         | 2020-02-11T00:00:00.000Z | withdrawal | 845        | 3404                     |
| 160         | 2020-02-11T00:00:00.000Z | withdrawal | 982        | 3404                     |
| 160         | 2020-02-13T00:00:00.000Z | deposit    | 18         | 3422                     |
| 160         | 2020-02-21T00:00:00.000Z | deposit    | 421        | 3843                     |
| 160         | 2020-02-23T00:00:00.000Z | withdrawal | 632        | 4475                     |
| 160         | 2020-02-26T00:00:00.000Z | deposit    | 986        | 5461                     |
| 160         | 2020-03-01T00:00:00.000Z | purchase   | 459        | 5002                     |
| 160         | 2020-03-23T00:00:00.000Z | deposit    | 767        | 5769                     |
| 160         | 2020-03-28T00:00:00.000Z | withdrawal | 920        | 6689                     |
| 160         | 2020-04-04T00:00:00.000Z | purchase   | 633        | 6056                     |
| 160         | 2020-04-11T00:00:00.000Z | deposit    | 75         | 6131                     |
| 160         | 2020-04-15T00:00:00.000Z | deposit    | 320        | 6451                     |
| 161         | 2020-01-08T00:00:00.000Z | deposit    | 526        | 1440                     |
| 161         | 2020-01-08T00:00:00.000Z | withdrawal | 914        | 1440                     |
| 161         | 2020-01-09T00:00:00.000Z | purchase   | 160        | 1280                     |
| 161         | 2020-01-15T00:00:00.000Z | withdrawal | 67         | 1347                     |
| 161         | 2020-01-21T00:00:00.000Z | withdrawal | 50         | 1397                     |
| 161         | 2020-01-25T00:00:00.000Z | withdrawal | 177        | 1574                     |
| 161         | 2020-01-29T00:00:00.000Z | purchase   | 279        | 1295                     |
| 161         | 2020-02-11T00:00:00.000Z | deposit    | 440        | 1735                     |
| 161         | 2020-02-12T00:00:00.000Z | purchase   | 743        | 992                      |
| 161         | 2020-02-20T00:00:00.000Z | purchase   | 553        | 439                      |
| 161         | 2020-02-23T00:00:00.000Z | deposit    | 380        | 819                      |
| 161         | 2020-02-29T00:00:00.000Z | deposit    | 636        | 1455                     |
| 161         | 2020-03-02T00:00:00.000Z | deposit    | 832        | 2287                     |
| 161         | 2020-03-11T00:00:00.000Z | deposit    | 342        | 2629                     |
| 161         | 2020-03-15T00:00:00.000Z | deposit    | 177        | 2806                     |
| 161         | 2020-03-16T00:00:00.000Z | purchase   | 379        | 2427                     |
| 161         | 2020-03-21T00:00:00.000Z | purchase   | 735        | 1692                     |
| 161         | 2020-03-27T00:00:00.000Z | withdrawal | 722        | 2414                     |
| 161         | 2020-03-30T00:00:00.000Z | withdrawal | 243        | 2657                     |
| 161         | 2020-03-31T00:00:00.000Z | deposit    | 869        | 4055                     |
| 161         | 2020-03-31T00:00:00.000Z | deposit    | 529        | 4055                     |
| 162         | 2020-01-10T00:00:00.000Z | deposit    | 123        | 123                      |
| 162         | 2020-02-01T00:00:00.000Z | deposit    | 847        | 970                      |
| 162         | 2020-02-08T00:00:00.000Z | purchase   | 186        | 784                      |
| 163         | 2020-01-14T00:00:00.000Z | deposit    | 523        | 523                      |
| 163         | 2020-01-18T00:00:00.000Z | purchase   | 596        | -73                      |
| 163         | 2020-02-09T00:00:00.000Z | purchase   | 118        | -191                     |
| 163         | 2020-02-12T00:00:00.000Z | purchase   | 137        | -328                     |
| 163         | 2020-03-02T00:00:00.000Z | withdrawal | 197        | -131                     |
| 163         | 2020-03-09T00:00:00.000Z | withdrawal | 747        | 616                      |
| 163         | 2020-03-14T00:00:00.000Z | purchase   | 867        | -251                     |
| 163         | 2020-03-26T00:00:00.000Z | withdrawal | 792        | 541                      |
| 163         | 2020-03-27T00:00:00.000Z | withdrawal | 185        | 726                      |
| 163         | 2020-04-02T00:00:00.000Z | purchase   | 579        | 147                      |
| 163         | 2020-04-03T00:00:00.000Z | purchase   | 969        | -822                     |
| 163         | 2020-04-04T00:00:00.000Z | deposit    | 622        | -200                     |
| 163         | 2020-04-06T00:00:00.000Z | deposit    | 581        | 381                      |
| 163         | 2020-04-07T00:00:00.000Z | deposit    | 406        | 787                      |
| 164         | 2020-01-10T00:00:00.000Z | deposit    | 548        | 548                      |
| 164         | 2020-02-16T00:00:00.000Z | deposit    | 409        | 957                      |
| 165         | 2020-01-23T00:00:00.000Z | deposit    | 42         | 42                       |
| 165         | 2020-01-24T00:00:00.000Z | purchase   | 393        | -351                     |
| 165         | 2020-01-25T00:00:00.000Z | deposit    | 391        | 40                       |
| 165         | 2020-01-26T00:00:00.000Z | deposit    | 439        | 479                      |
| 165         | 2020-01-28T00:00:00.000Z | purchase   | 540        | -61                      |
| 165         | 2020-02-02T00:00:00.000Z | deposit    | 185        | 124                      |
| 165         | 2020-02-08T00:00:00.000Z | deposit    | 250        | 374                      |
| 165         | 2020-02-14T00:00:00.000Z | purchase   | 593        | -219                     |
| 165         | 2020-02-25T00:00:00.000Z | withdrawal | 869        | 650                      |
| 165         | 2020-03-03T00:00:00.000Z | withdrawal | 901        | 1551                     |
| 165         | 2020-03-05T00:00:00.000Z | withdrawal | 199        | 1750                     |
| 165         | 2020-03-17T00:00:00.000Z | purchase   | 230        | 806                      |
| 165         | 2020-03-17T00:00:00.000Z | purchase   | 714        | 806                      |
| 165         | 2020-03-21T00:00:00.000Z | purchase   | 784        | 22                       |
| 165         | 2020-03-22T00:00:00.000Z | deposit    | 215        | 237                      |
| 165         | 2020-04-02T00:00:00.000Z | deposit    | 763        | 1353                     |
| 165         | 2020-04-02T00:00:00.000Z | deposit    | 353        | 1353                     |
| 165         | 2020-04-06T00:00:00.000Z | withdrawal | 985        | 2338                     |
| 165         | 2020-04-10T00:00:00.000Z | withdrawal | 297        | 2635                     |
| 165         | 2020-04-12T00:00:00.000Z | withdrawal | 164        | 2799                     |
| 165         | 2020-04-17T00:00:00.000Z | deposit    | 197        | 2996                     |
| 165         | 2020-04-21T00:00:00.000Z | withdrawal | 97         | 3093                     |
| 166         | 2020-01-22T00:00:00.000Z | deposit    | 957        | 957                      |
| 166         | 2020-02-13T00:00:00.000Z | deposit    | 589        | 1546                     |
| 166         | 2020-03-11T00:00:00.000Z | deposit    | 285        | 1831                     |
| 166         | 2020-03-25T00:00:00.000Z | withdrawal | 528        | 2359                     |
| 166         | 2020-04-06T00:00:00.000Z | deposit    | 185        | 2544                     |
| 166         | 2020-04-13T00:00:00.000Z | deposit    | 295        | 2839                     |
| 167         | 2020-01-30T00:00:00.000Z | deposit    | 51         | 51                       |
| 167         | 2020-02-03T00:00:00.000Z | deposit    | 545        | 596                      |
| 167         | 2020-02-04T00:00:00.000Z | purchase   | 12         | 584                      |
| 167         | 2020-02-06T00:00:00.000Z | deposit    | 101        | 685                      |
| 167         | 2020-02-09T00:00:00.000Z | deposit    | 669        | 1354                     |
| 167         | 2020-02-21T00:00:00.000Z | withdrawal | 88         | 1442                     |
| 167         | 2020-02-29T00:00:00.000Z | purchase   | 692        | 750                      |
| 167         | 2020-03-02T00:00:00.000Z | withdrawal | 6          | 756                      |
| 167         | 2020-03-03T00:00:00.000Z | deposit    | 14         | 770                      |
| 167         | 2020-03-07T00:00:00.000Z | purchase   | 244        | 526                      |
| 167         | 2020-03-11T00:00:00.000Z | withdrawal | 804        | 1330                     |
| 167         | 2020-03-13T00:00:00.000Z | purchase   | 49         | 1281                     |
| 167         | 2020-03-16T00:00:00.000Z | purchase   | 51         | 1230                     |
| 167         | 2020-04-02T00:00:00.000Z | withdrawal | 711        | 1941                     |
| 167         | 2020-04-07T00:00:00.000Z | deposit    | 766        | 2707                     |
| 167         | 2020-04-18T00:00:00.000Z | deposit    | 942        | 3649                     |
| 167         | 2020-04-21T00:00:00.000Z | purchase   | 163        | 3639                     |
| 167         | 2020-04-21T00:00:00.000Z | deposit    | 153        | 3639                     |
| 167         | 2020-04-23T00:00:00.000Z | withdrawal | 180        | 3819                     |
| 167         | 2020-04-25T00:00:00.000Z | withdrawal | 989        | 4808                     |
| 168         | 2020-01-13T00:00:00.000Z | deposit    | 114        | 114                      |
| 168         | 2020-02-03T00:00:00.000Z | deposit    | 187        | 301                      |
| 168         | 2020-02-24T00:00:00.000Z | purchase   | 919        | -618                     |
| 168         | 2020-02-25T00:00:00.000Z | purchase   | 183        | -801                     |
| 169         | 2020-01-10T00:00:00.000Z | deposit    | 628        | 628                      |
| 169         | 2020-01-14T00:00:00.000Z | withdrawal | 601        | 1229                     |
| 169         | 2020-01-19T00:00:00.000Z | purchase   | 268        | 961                      |
| 169         | 2020-01-25T00:00:00.000Z | purchase   | 985        | -24                      |
| 169         | 2020-01-29T00:00:00.000Z | deposit    | 657        | 633                      |
| 169         | 2020-02-06T00:00:00.000Z | deposit    | 176        | 809                      |
| 169         | 2020-02-19T00:00:00.000Z | withdrawal | 417        | 1226                     |
| 169         | 2020-02-26T00:00:00.000Z | deposit    | 59         | 1285                     |
| 169         | 2020-02-28T00:00:00.000Z | withdrawal | 439        | 1724                     |
| 169         | 2020-03-09T00:00:00.000Z | deposit    | 737        | 2461                     |
| 169         | 2020-03-15T00:00:00.000Z | withdrawal | 3          | 2464                     |
| 169         | 2020-03-16T00:00:00.000Z | deposit    | 529        | 2993                     |
| 169         | 2020-03-22T00:00:00.000Z | purchase   | 64         | 2929                     |
| 169         | 2020-04-08T00:00:00.000Z | deposit    | 897        | 3826                     |
| 170         | 2020-01-14T00:00:00.000Z | deposit    | 788        | 788                      |
| 170         | 2020-01-21T00:00:00.000Z | deposit    | 339        | 1127                     |
| 170         | 2020-01-28T00:00:00.000Z | withdrawal | 759        | 1886                     |
| 170         | 2020-01-30T00:00:00.000Z | withdrawal | 406        | 2292                     |
| 170         | 2020-02-11T00:00:00.000Z | purchase   | 335        | 1957                     |
| 170         | 2020-03-13T00:00:00.000Z | purchase   | 773        | 1184                     |
| 170         | 2020-03-15T00:00:00.000Z | deposit    | 675        | 2419                     |
| 170         | 2020-03-15T00:00:00.000Z | deposit    | 560        | 2419                     |
| 170         | 2020-03-20T00:00:00.000Z | withdrawal | 226        | 2645                     |
| 170         | 2020-04-02T00:00:00.000Z | purchase   | 392        | 2253                     |
| 170         | 2020-04-03T00:00:00.000Z | deposit    | 296        | 2549                     |
| 170         | 2020-04-04T00:00:00.000Z | purchase   | 617        | 1932                     |
| 171         | 2020-01-17T00:00:00.000Z | deposit    | 471        | 471                      |
| 171         | 2020-01-21T00:00:00.000Z | purchase   | 795        | -594                     |
| 171         | 2020-01-21T00:00:00.000Z | purchase   | 270        | -594                     |
| 171         | 2020-01-23T00:00:00.000Z | deposit    | 397        | -197                     |
| 171         | 2020-02-02T00:00:00.000Z | withdrawal | 989        | 792                      |
| 171         | 2020-02-12T00:00:00.000Z | deposit    | 451        | 1243                     |
| 171         | 2020-02-24T00:00:00.000Z | withdrawal | 721        | 1964                     |
| 171         | 2020-02-26T00:00:00.000Z | deposit    | 699        | 2663                     |
| 171         | 2020-02-29T00:00:00.000Z | withdrawal | 643        | 3306                     |
| 171         | 2020-03-18T00:00:00.000Z | withdrawal | 201        | 3507                     |
| 171         | 2020-03-22T00:00:00.000Z | withdrawal | 765        | 4272                     |
| 171         | 2020-03-24T00:00:00.000Z | deposit    | 445        | 4717                     |
| 171         | 2020-04-03T00:00:00.000Z | withdrawal | 297        | 5014                     |
| 171         | 2020-04-06T00:00:00.000Z | deposit    | 548        | 5562                     |
| 171         | 2020-04-12T00:00:00.000Z | deposit    | 759        | 6321                     |
| 172         | 2020-01-12T00:00:00.000Z | deposit    | 548        | 548                      |
| 172         | 2020-01-14T00:00:00.000Z | withdrawal | 966        | 1514                     |
| 172         | 2020-01-31T00:00:00.000Z | deposit    | 244        | 1758                     |
| 172         | 2020-03-10T00:00:00.000Z | deposit    | 59         | 1817                     |
| 172         | 2020-03-13T00:00:00.000Z | withdrawal | 446        | 2263                     |
| 172         | 2020-03-16T00:00:00.000Z | withdrawal | 477        | 2740                     |
| 173         | 2020-01-14T00:00:00.000Z | deposit    | 720        | 720                      |
| 173         | 2020-01-25T00:00:00.000Z | deposit    | 578        | 1298                     |
| 173         | 2020-02-04T00:00:00.000Z | deposit    | 486        | 1784                     |
| 173         | 2020-02-14T00:00:00.000Z | withdrawal | 383        | 2167                     |
| 173         | 2020-02-27T00:00:00.000Z | purchase   | 3          | 2164                     |
| 173         | 2020-03-05T00:00:00.000Z | withdrawal | 708        | 2872                     |
| 173         | 2020-03-07T00:00:00.000Z | deposit    | 660        | 3532                     |
| 173         | 2020-03-09T00:00:00.000Z | deposit    | 124        | 3656                     |
| 173         | 2020-03-23T00:00:00.000Z | purchase   | 562        | 3094                     |
| 173         | 2020-04-07T00:00:00.000Z | withdrawal | 791        | 3885                     |
| 174         | 2020-01-11T00:00:00.000Z | deposit    | 163        | 1142                     |
| 174         | 2020-01-11T00:00:00.000Z | deposit    | 979        | 1142                     |
| 174         | 2020-02-11T00:00:00.000Z | withdrawal | 821        | 1963                     |
| 174         | 2020-02-23T00:00:00.000Z | purchase   | 637        | 1326                     |
| 174         | 2020-02-25T00:00:00.000Z | deposit    | 218        | 1544                     |
| 174         | 2020-03-10T00:00:00.000Z | withdrawal | 540        | 2084                     |
| 174         | 2020-03-15T00:00:00.000Z | withdrawal | 855        | 2939                     |
| 174         | 2020-03-18T00:00:00.000Z | withdrawal | 607        | 3546                     |
| 174         | 2020-03-20T00:00:00.000Z | deposit    | 965        | 4511                     |
| 174         | 2020-04-02T00:00:00.000Z | deposit    | 936        | 5447                     |
| 174         | 2020-04-08T00:00:00.000Z | deposit    | 843        | 6290                     |
| 175         | 2020-01-14T00:00:00.000Z | deposit    | 300        | 300                      |
| 175         | 2020-01-15T00:00:00.000Z | deposit    | 546        | 846                      |
| 175         | 2020-01-20T00:00:00.000Z | deposit    | 53         | 899                      |
| 175         | 2020-01-21T00:00:00.000Z | purchase   | 35         | 864                      |
| 175         | 2020-01-22T00:00:00.000Z | deposit    | 99         | 963                      |
| 175         | 2020-01-24T00:00:00.000Z | withdrawal | 754        | 1717                     |
| 175         | 2020-01-31T00:00:00.000Z | purchase   | 535        | 1182                     |
| 175         | 2020-02-04T00:00:00.000Z | deposit    | 242        | 1424                     |
| 175         | 2020-02-20T00:00:00.000Z | purchase   | 671        | 753                      |
| 175         | 2020-03-06T00:00:00.000Z | purchase   | 505        | 248                      |
| 175         | 2020-03-08T00:00:00.000Z | withdrawal | 336        | 584                      |
| 175         | 2020-03-10T00:00:00.000Z | withdrawal | 201        | 785                      |
| 175         | 2020-03-15T00:00:00.000Z | withdrawal | 135        | 920                      |
| 175         | 2020-03-17T00:00:00.000Z | deposit    | 110        | 1030                     |
| 175         | 2020-04-05T00:00:00.000Z | purchase   | 897        | 1122                     |
| 175         | 2020-04-05T00:00:00.000Z | deposit    | 989        | 1122                     |
| 175         | 2020-04-06T00:00:00.000Z | deposit    | 181        | 1303                     |
| 176         | 2020-01-26T00:00:00.000Z | deposit    | 655        | 655                      |
| 176         | 2020-02-04T00:00:00.000Z | withdrawal | 828        | 1483                     |
| 176         | 2020-02-13T00:00:00.000Z | deposit    | 434        | 1917                     |
| 176         | 2020-02-16T00:00:00.000Z | deposit    | 344        | 2261                     |
| 176         | 2020-03-15T00:00:00.000Z | withdrawal | 103        | 2364                     |
| 176         | 2020-03-24T00:00:00.000Z | purchase   | 968        | 1396                     |
| 176         | 2020-03-27T00:00:00.000Z | withdrawal | 65         | 1461                     |
| 176         | 2020-04-02T00:00:00.000Z | withdrawal | 536        | 1997                     |
| 177         | 2020-01-20T00:00:00.000Z | deposit    | 351        | 351                      |
| 177         | 2020-01-22T00:00:00.000Z | deposit    | 54         | 405                      |
| 177         | 2020-02-01T00:00:00.000Z | withdrawal | 645        | 1050                     |
| 177         | 2020-02-08T00:00:00.000Z | deposit    | 802        | 1852                     |
| 177         | 2020-02-20T00:00:00.000Z | deposit    | 135        | 1987                     |
| 177         | 2020-02-22T00:00:00.000Z | withdrawal | 853        | 2840                     |
| 177         | 2020-03-05T00:00:00.000Z | withdrawal | 681        | 3521                     |
| 177         | 2020-03-09T00:00:00.000Z | deposit    | 706        | 4227                     |
| 177         | 2020-03-12T00:00:00.000Z | purchase   | 832        | 3395                     |
| 177         | 2020-03-14T00:00:00.000Z | purchase   | 78         | 3317                     |
| 177         | 2020-03-18T00:00:00.000Z | purchase   | 960        | 2357                     |
| 177         | 2020-03-20T00:00:00.000Z | deposit    | 948        | 3305                     |
| 177         | 2020-03-21T00:00:00.000Z | deposit    | 411        | 3716                     |
| 177         | 2020-03-23T00:00:00.000Z | deposit    | 772        | 4488                     |
| 177         | 2020-03-28T00:00:00.000Z | deposit    | 499        | 4987                     |
| 177         | 2020-03-30T00:00:00.000Z | deposit    | 171        | 5158                     |
| 177         | 2020-04-01T00:00:00.000Z | purchase   | 985        | 4173                     |
| 177         | 2020-04-15T00:00:00.000Z | purchase   | 789        | 3384                     |
| 178         | 2020-01-23T00:00:00.000Z | deposit    | 176        | 252                      |
| 178         | 2020-01-23T00:00:00.000Z | deposit    | 76         | 252                      |
| 178         | 2020-02-03T00:00:00.000Z | withdrawal | 234        | 486                      |
| 178         | 2020-02-10T00:00:00.000Z | deposit    | 23         | 509                      |
| 178         | 2020-02-14T00:00:00.000Z | purchase   | 97         | 412                      |
| 178         | 2020-02-17T00:00:00.000Z | deposit    | 443        | 855                      |
| 178         | 2020-03-10T00:00:00.000Z | withdrawal | 387        | 2042                     |
| 178         | 2020-03-10T00:00:00.000Z | deposit    | 800        | 2042                     |
| 178         | 2020-03-17T00:00:00.000Z | withdrawal | 147        | 2189                     |
| 178         | 2020-03-19T00:00:00.000Z | purchase   | 244        | 1945                     |
| 178         | 2020-03-25T00:00:00.000Z | withdrawal | 19         | 1964                     |
| 178         | 2020-04-08T00:00:00.000Z | withdrawal | 500        | 2464                     |
| 178         | 2020-04-15T00:00:00.000Z | purchase   | 898        | 1566                     |
| 178         | 2020-04-19T00:00:00.000Z | purchase   | 975        | 591                      |
| 179         | 2020-01-05T00:00:00.000Z | deposit    | 19         | 19                       |
| 179         | 2020-01-11T00:00:00.000Z | purchase   | 892        | -873                     |
| 179         | 2020-01-13T00:00:00.000Z | deposit    | 470        | -403                     |
| 179         | 2020-01-14T00:00:00.000Z | purchase   | 882        | -1285                    |
| 179         | 2020-01-26T00:00:00.000Z | deposit    | 58         | -739                     |
| 179         | 2020-01-26T00:00:00.000Z | withdrawal | 488        | -739                     |
| 179         | 2020-01-28T00:00:00.000Z | withdrawal | 39         | -700                     |
| 179         | 2020-02-01T00:00:00.000Z | purchase   | 752        | -1452                    |
| 179         | 2020-02-05T00:00:00.000Z | withdrawal | 106        | -1346                    |
| 179         | 2020-02-09T00:00:00.000Z | purchase   | 638        | -1984                    |
| 179         | 2020-02-10T00:00:00.000Z | purchase   | 384        | -2368                    |
| 179         | 2020-02-15T00:00:00.000Z | withdrawal | 443        | -1234                    |
| 179         | 2020-02-15T00:00:00.000Z | deposit    | 691        | -1234                    |
| 179         | 2020-03-05T00:00:00.000Z | purchase   | 300        | -794                     |
| 179         | 2020-03-05T00:00:00.000Z | withdrawal | 740        | -794                     |
| 179         | 2020-03-11T00:00:00.000Z | withdrawal | 831        | 37                       |
| 179         | 2020-03-14T00:00:00.000Z | purchase   | 688        | -651                     |
| 179         | 2020-03-17T00:00:00.000Z | withdrawal | 283        | -368                     |
| 179         | 2020-03-19T00:00:00.000Z | purchase   | 597        | -965                     |
| 179         | 2020-03-20T00:00:00.000Z | deposit    | 516        | -449                     |
| 179         | 2020-03-27T00:00:00.000Z | purchase   | 969        | -1418                    |
| 179         | 2020-03-31T00:00:00.000Z | withdrawal | 675        | -743                     |
| 180         | 2020-01-09T00:00:00.000Z | deposit    | 670        | 670                      |
| 180         | 2020-01-13T00:00:00.000Z | purchase   | 556        | 114                      |
| 180         | 2020-01-25T00:00:00.000Z | withdrawal | 952        | 1066                     |
| 180         | 2020-02-26T00:00:00.000Z | withdrawal | 970        | 2036                     |
| 180         | 2020-03-15T00:00:00.000Z | purchase   | 996        | 1040                     |
| 180         | 2020-04-05T00:00:00.000Z | withdrawal | 371        | 1411                     |
| 181         | 2020-01-13T00:00:00.000Z | deposit    | 865        | 865                      |
| 181         | 2020-01-15T00:00:00.000Z | purchase   | 176        | 689                      |
| 181         | 2020-01-17T00:00:00.000Z | withdrawal | 370        | 1059                     |
| 181         | 2020-01-22T00:00:00.000Z | deposit    | 669        | 1728                     |
| 181         | 2020-01-26T00:00:00.000Z | withdrawal | 165        | 1893                     |
| 181         | 2020-01-29T00:00:00.000Z | withdrawal | 870        | 2763                     |
| 181         | 2020-02-06T00:00:00.000Z | purchase   | 712        | 2051                     |
| 181         | 2020-02-10T00:00:00.000Z | purchase   | 674        | 1377                     |
| 181         | 2020-02-13T00:00:00.000Z | deposit    | 880        | 2257                     |
| 181         | 2020-02-17T00:00:00.000Z | purchase   | 673        | 1584                     |
| 181         | 2020-02-24T00:00:00.000Z | deposit    | 576        | 2160                     |
| 181         | 2020-02-25T00:00:00.000Z | deposit    | 596        | 2756                     |
| 181         | 2020-02-26T00:00:00.000Z | purchase   | 789        | 1967                     |
| 181         | 2020-03-12T00:00:00.000Z | withdrawal | 349        | 2316                     |
| 181         | 2020-03-22T00:00:00.000Z | withdrawal | 365        | 2681                     |
| 181         | 2020-03-23T00:00:00.000Z | withdrawal | 384        | 3065                     |
| 181         | 2020-03-24T00:00:00.000Z | purchase   | 339        | 2726                     |
| 181         | 2020-03-27T00:00:00.000Z | withdrawal | 360        | 3086                     |
| 182         | 2020-01-08T00:00:00.000Z | deposit    | 97         | 97                       |
| 182         | 2020-02-04T00:00:00.000Z | purchase   | 868        | -771                     |
| 182         | 2020-02-23T00:00:00.000Z | deposit    | 447        | -324                     |
| 182         | 2020-02-24T00:00:00.000Z | withdrawal | 321        | -3                       |
| 182         | 2020-02-25T00:00:00.000Z | deposit    | 600        | 597                      |
| 182         | 2020-03-16T00:00:00.000Z | withdrawal | 798        | 1395                     |
| 182         | 2020-04-01T00:00:00.000Z | withdrawal | 239        | 1634                     |
| 182         | 2020-04-05T00:00:00.000Z | deposit    | 923        | 2557                     |
| 183         | 2020-01-22T00:00:00.000Z | deposit    | 101        | 101                      |
| 183         | 2020-01-28T00:00:00.000Z | purchase   | 392        | -291                     |
| 183         | 2020-01-29T00:00:00.000Z | deposit    | 743        | 452                      |
| 183         | 2020-01-31T00:00:00.000Z | withdrawal | 992        | 1444                     |
| 183         | 2020-02-09T00:00:00.000Z | purchase   | 37         | 1842                     |
| 183         | 2020-02-09T00:00:00.000Z | withdrawal | 435        | 1842                     |
| 183         | 2020-02-12T00:00:00.000Z | purchase   | 876        | 966                      |
| 183         | 2020-02-13T00:00:00.000Z | withdrawal | 983        | 1949                     |
| 183         | 2020-02-28T00:00:00.000Z | withdrawal | 858        | 2807                     |
| 183         | 2020-03-07T00:00:00.000Z | purchase   | 862        | 1764                     |
| 183         | 2020-03-07T00:00:00.000Z | purchase   | 181        | 1764                     |
| 183         | 2020-03-09T00:00:00.000Z | withdrawal | 275        | 2039                     |
| 183         | 2020-03-18T00:00:00.000Z | withdrawal | 684        | 2723                     |
| 183         | 2020-03-23T00:00:00.000Z | withdrawal | 352        | 3075                     |
| 183         | 2020-04-01T00:00:00.000Z | deposit    | 706        | 3803                     |
| 183         | 2020-04-01T00:00:00.000Z | withdrawal | 22         | 3803                     |
| 183         | 2020-04-10T00:00:00.000Z | deposit    | 173        | 3976                     |
| 183         | 2020-04-11T00:00:00.000Z | withdrawal | 738        | 4714                     |
| 183         | 2020-04-15T00:00:00.000Z | withdrawal | 596        | 5310                     |
| 184         | 2020-01-27T00:00:00.000Z | deposit    | 472        | 472                      |
| 184         | 2020-02-02T00:00:00.000Z | deposit    | 952        | 1424                     |
| 184         | 2020-02-06T00:00:00.000Z | purchase   | 807        | 617                      |
| 184         | 2020-02-10T00:00:00.000Z | withdrawal | 61         | 678                      |
| 184         | 2020-02-15T00:00:00.000Z | deposit    | 475        | 440                      |
| 184         | 2020-02-15T00:00:00.000Z | purchase   | 713        | 440                      |
| 184         | 2020-02-17T00:00:00.000Z | purchase   | 649        | -209                     |
| 184         | 2020-03-08T00:00:00.000Z | purchase   | 483        | -692                     |
| 184         | 2020-03-09T00:00:00.000Z | purchase   | 220        | -912                     |
| 184         | 2020-03-10T00:00:00.000Z | purchase   | 541        | -1453                    |
| 184         | 2020-03-13T00:00:00.000Z | withdrawal | 45         | -1408                    |
| 184         | 2020-03-26T00:00:00.000Z | withdrawal | 910        | -498                     |
| 184         | 2020-04-03T00:00:00.000Z | deposit    | 253        | -245                     |
| 184         | 2020-04-12T00:00:00.000Z | deposit    | 590        | 345                      |
| 184         | 2020-04-20T00:00:00.000Z | deposit    | 129        | 474                      |
| 184         | 2020-04-24T00:00:00.000Z | purchase   | 740        | 614                      |
| 184         | 2020-04-24T00:00:00.000Z | withdrawal | 880        | 614                      |
| 185         | 2020-01-29T00:00:00.000Z | deposit    | 626        | 626                      |
| 185         | 2020-02-01T00:00:00.000Z | deposit    | 786        | 1412                     |
| 185         | 2020-02-04T00:00:00.000Z | purchase   | 193        | 1219                     |
| 185         | 2020-02-10T00:00:00.000Z | withdrawal | 143        | 1362                     |
| 185         | 2020-02-14T00:00:00.000Z | withdrawal | 640        | 2002                     |
| 185         | 2020-02-27T00:00:00.000Z | purchase   | 447        | 1555                     |
| 185         | 2020-03-08T00:00:00.000Z | purchase   | 401        | 1154                     |
| 185         | 2020-03-21T00:00:00.000Z | deposit    | 791        | 1945                     |
| 185         | 2020-03-27T00:00:00.000Z | withdrawal | 642        | 2587                     |
| 185         | 2020-03-30T00:00:00.000Z | purchase   | 738        | 1849                     |
| 185         | 2020-04-07T00:00:00.000Z | purchase   | 366        | 1483                     |
| 185         | 2020-04-08T00:00:00.000Z | withdrawal | 224        | 1186                     |
| 185         | 2020-04-08T00:00:00.000Z | purchase   | 521        | 1186                     |
| 185         | 2020-04-12T00:00:00.000Z | deposit    | 825        | 2477                     |
| 185         | 2020-04-12T00:00:00.000Z | deposit    | 466        | 2477                     |
| 185         | 2020-04-15T00:00:00.000Z | withdrawal | 917        | 3394                     |
| 185         | 2020-04-20T00:00:00.000Z | purchase   | 499        | 2895                     |
| 185         | 2020-04-22T00:00:00.000Z | deposit    | 884        | 3779                     |
| 185         | 2020-04-24T00:00:00.000Z | deposit    | 848        | 4627                     |
| 186         | 2020-01-17T00:00:00.000Z | deposit    | 968        | 968                      |
| 186         | 2020-01-27T00:00:00.000Z | withdrawal | 351        | 1319                     |
| 186         | 2020-01-31T00:00:00.000Z | withdrawal | 83         | 1402                     |
| 186         | 2020-02-03T00:00:00.000Z | purchase   | 368        | 1034                     |
| 186         | 2020-02-09T00:00:00.000Z | deposit    | 354        | 1388                     |
| 186         | 2020-02-14T00:00:00.000Z | deposit    | 259        | 1647                     |
| 186         | 2020-02-25T00:00:00.000Z | purchase   | 267        | 1380                     |
| 186         | 2020-02-27T00:00:00.000Z | deposit    | 833        | 2213                     |
| 186         | 2020-03-05T00:00:00.000Z | purchase   | 780        | 1433                     |
| 186         | 2020-03-06T00:00:00.000Z | purchase   | 93         | 1340                     |
| 186         | 2020-03-09T00:00:00.000Z | deposit    | 943        | 2283                     |
| 186         | 2020-03-11T00:00:00.000Z | purchase   | 130        | 2153                     |
| 186         | 2020-03-23T00:00:00.000Z | withdrawal | 641        | 2794                     |
| 186         | 2020-03-25T00:00:00.000Z | deposit    | 798        | 3592                     |
| 186         | 2020-03-27T00:00:00.000Z | deposit    | 488        | 4080                     |
| 186         | 2020-04-07T00:00:00.000Z | withdrawal | 640        | 4720                     |
| 186         | 2020-04-08T00:00:00.000Z | deposit    | 490        | 4467                     |
| 186         | 2020-04-08T00:00:00.000Z | purchase   | 743        | 4467                     |
| 186         | 2020-04-12T00:00:00.000Z | deposit    | 247        | 4714                     |
| 187         | 2020-01-26T00:00:00.000Z | purchase   | 810        | -211                     |
| 187         | 2020-01-26T00:00:00.000Z | deposit    | 599        | -211                     |
| 187         | 2020-02-05T00:00:00.000Z | purchase   | 523        | -734                     |
| 187         | 2020-02-16T00:00:00.000Z | purchase   | 254        | -988                     |
| 187         | 2020-02-19T00:00:00.000Z | withdrawal | 439        | -549                     |
| 187         | 2020-02-22T00:00:00.000Z | deposit    | 48         | -501                     |
| 187         | 2020-03-04T00:00:00.000Z | purchase   | 753        | -1254                    |
| 187         | 2020-03-21T00:00:00.000Z | purchase   | 791        | -2045                    |
| 187         | 2020-03-23T00:00:00.000Z | purchase   | 137        | -2182                    |
| 187         | 2020-04-06T00:00:00.000Z | deposit    | 928        | -1254                    |
| 187         | 2020-04-18T00:00:00.000Z | purchase   | 140        | -1394                    |
| 188         | 2020-01-13T00:00:00.000Z | deposit    | 601        | 601                      |
| 188         | 2020-01-22T00:00:00.000Z | withdrawal | 340        | 941                      |
| 188         | 2020-01-27T00:00:00.000Z | withdrawal | 632        | 1573                     |
| 188         | 2020-01-29T00:00:00.000Z | deposit    | 259        | 1832                     |
| 188         | 2020-01-31T00:00:00.000Z | withdrawal | 72         | 1904                     |
| 188         | 2020-02-11T00:00:00.000Z | deposit    | 809        | 2713                     |
| 188         | 2020-02-15T00:00:00.000Z | deposit    | 459        | 3172                     |
| 188         | 2020-02-20T00:00:00.000Z | withdrawal | 770        | 3942                     |
| 188         | 2020-02-24T00:00:00.000Z | deposit    | 699        | 4641                     |
| 188         | 2020-03-06T00:00:00.000Z | withdrawal | 743        | 5384                     |
| 188         | 2020-03-10T00:00:00.000Z | deposit    | 587        | 5971                     |
| 188         | 2020-03-29T00:00:00.000Z | withdrawal | 314        | 6285                     |
| 188         | 2020-03-30T00:00:00.000Z | purchase   | 491        | 5794                     |
| 188         | 2020-04-02T00:00:00.000Z | purchase   | 473        | 5321                     |
| 188         | 2020-04-07T00:00:00.000Z | purchase   | 54         | 5267                     |
| 189         | 2020-01-11T00:00:00.000Z | deposit    | 304        | 304                      |
| 189         | 2020-01-12T00:00:00.000Z | deposit    | 373        | 677                      |
| 189         | 2020-01-22T00:00:00.000Z | deposit    | 302        | 979                      |
| 189         | 2020-01-27T00:00:00.000Z | withdrawal | 861        | 1840                     |
| 189         | 2020-01-30T00:00:00.000Z | purchase   | 956        | 884                      |
| 189         | 2020-02-03T00:00:00.000Z | withdrawal | 870        | 1754                     |
| 189         | 2020-02-06T00:00:00.000Z | purchase   | 393        | 1361                     |
| 189         | 2020-03-17T00:00:00.000Z | purchase   | 726        | 635                      |
| 189         | 2020-03-18T00:00:00.000Z | withdrawal | 462        | 1097                     |
| 189         | 2020-03-22T00:00:00.000Z | purchase   | 718        | 379                      |
| 190         | 2020-01-26T00:00:00.000Z | deposit    | 14         | 14                       |
| 190         | 2020-02-19T00:00:00.000Z | deposit    | 445        | 459                      |
| 190         | 2020-03-06T00:00:00.000Z | purchase   | 449        | 10                       |
| 190         | 2020-03-24T00:00:00.000Z | deposit    | 513        | 523                      |
| 190         | 2020-04-06T00:00:00.000Z | deposit    | 655        | 1178                     |
| 191         | 2020-01-16T00:00:00.000Z | deposit    | 769        | 769                      |
| 191         | 2020-01-20T00:00:00.000Z | deposit    | 863        | 1632                     |
| 191         | 2020-02-02T00:00:00.000Z | deposit    | 143        | 1775                     |
| 191         | 2020-02-10T00:00:00.000Z | withdrawal | 469        | 2244                     |
| 191         | 2020-03-26T00:00:00.000Z | purchase   | 270        | 1974                     |
| 191         | 2020-04-09T00:00:00.000Z | withdrawal | 157        | 2131                     |
| 192         | 2020-01-20T00:00:00.000Z | deposit    | 906        | 906                      |
| 192         | 2020-01-22T00:00:00.000Z | deposit    | 735        | 1641                     |
| 192         | 2020-01-30T00:00:00.000Z | deposit    | 885        | 2526                     |
| 192         | 2020-02-04T00:00:00.000Z | deposit    | 686        | 3212                     |
| 192         | 2020-02-12T00:00:00.000Z | deposit    | 360        | 3572                     |
| 192         | 2020-02-14T00:00:00.000Z | purchase   | 640        | 4009                     |
| 192         | 2020-02-14T00:00:00.000Z | withdrawal | 672        | 4009                     |
| 192         | 2020-02-14T00:00:00.000Z | withdrawal | 405        | 4009                     |
| 192         | 2020-02-22T00:00:00.000Z | purchase   | 773        | 3236                     |
| 192         | 2020-02-24T00:00:00.000Z | purchase   | 949        | 2329                     |
| 192         | 2020-02-24T00:00:00.000Z | deposit    | 42         | 2329                     |
| 192         | 2020-02-26T00:00:00.000Z | withdrawal | 355        | 2684                     |
| 192         | 2020-02-28T00:00:00.000Z | withdrawal | 663        | 3347                     |
| 192         | 2020-02-29T00:00:00.000Z | deposit    | 154        | 3501                     |
| 192         | 2020-03-04T00:00:00.000Z | purchase   | 694        | 2807                     |
| 192         | 2020-03-17T00:00:00.000Z | withdrawal | 250        | 3057                     |
| 192         | 2020-03-21T00:00:00.000Z | deposit    | 746        | 3803                     |
| 192         | 2020-03-23T00:00:00.000Z | deposit    | 938        | 4741                     |
| 192         | 2020-03-27T00:00:00.000Z | purchase   | 253        | 4488                     |
| 192         | 2020-03-31T00:00:00.000Z | deposit    | 585        | 5073                     |
| 192         | 2020-04-13T00:00:00.000Z | deposit    | 756        | 5829                     |
| 193         | 2020-01-12T00:00:00.000Z | deposit    | 689        | 689                      |
| 193         | 2020-03-02T00:00:00.000Z | purchase   | 203        | 486                      |
| 194         | 2020-01-28T00:00:00.000Z | deposit    | 137        | 137                      |
| 194         | 2020-02-01T00:00:00.000Z | withdrawal | 785        | 288                      |
| 194         | 2020-02-01T00:00:00.000Z | purchase   | 634        | 288                      |
| 194         | 2020-02-18T00:00:00.000Z | purchase   | 965        | -677                     |
| 194         | 2020-02-29T00:00:00.000Z | deposit    | 36         | -641                     |
| 194         | 2020-03-01T00:00:00.000Z | deposit    | 454        | -187                     |
| 194         | 2020-03-02T00:00:00.000Z | withdrawal | 695        | 508                      |
| 194         | 2020-03-06T00:00:00.000Z | withdrawal | 532        | 1040                     |
| 194         | 2020-03-10T00:00:00.000Z | deposit    | 769        | 2284                     |
| 194         | 2020-03-10T00:00:00.000Z | deposit    | 475        | 2284                     |
| 194         | 2020-03-14T00:00:00.000Z | deposit    | 220        | 2504                     |
| 194         | 2020-03-15T00:00:00.000Z | deposit    | 392        | 2896                     |
| 194         | 2020-03-16T00:00:00.000Z | deposit    | 601        | 3497                     |
| 194         | 2020-03-24T00:00:00.000Z | deposit    | 705        | 4202                     |
| 194         | 2020-04-04T00:00:00.000Z | withdrawal | 941        | 5143                     |
| 194         | 2020-04-05T00:00:00.000Z | deposit    | 347        | 5490                     |
| 194         | 2020-04-13T00:00:00.000Z | purchase   | 269        | 5221                     |
| 194         | 2020-04-24T00:00:00.000Z | purchase   | 12         | 5209                     |
| 195         | 2020-01-19T00:00:00.000Z | deposit    | 489        | 489                      |
| 195         | 2020-03-23T00:00:00.000Z | purchase   | 83         | 406                      |
| 196         | 2020-01-13T00:00:00.000Z | deposit    | 734        | 734                      |
| 196         | 2020-02-04T00:00:00.000Z | withdrawal | 512        | 1246                     |
| 196         | 2020-02-11T00:00:00.000Z | deposit    | 736        | 1982                     |
| 196         | 2020-02-21T00:00:00.000Z | deposit    | 337        | 2319                     |
| 196         | 2020-03-25T00:00:00.000Z | deposit    | 87         | 2406                     |
| 197         | 2020-01-22T00:00:00.000Z | deposit    | 203        | 203                      |
| 197         | 2020-01-26T00:00:00.000Z | withdrawal | 649        | 852                      |
| 197         | 2020-02-08T00:00:00.000Z | deposit    | 825        | 1677                     |
| 197         | 2020-02-09T00:00:00.000Z | purchase   | 964        | 713                      |
| 197         | 2020-02-23T00:00:00.000Z | purchase   | 415        | 1090                     |
| 197         | 2020-02-23T00:00:00.000Z | deposit    | 792        | 1090                     |
| 197         | 2020-02-29T00:00:00.000Z | deposit    | 345        | 1435                     |
| 197         | 2020-03-07T00:00:00.000Z | deposit    | 922        | 2357                     |
| 197         | 2020-03-10T00:00:00.000Z | withdrawal | 852        | 3209                     |
| 197         | 2020-03-14T00:00:00.000Z | withdrawal | 356        | 3565                     |
| 197         | 2020-03-20T00:00:00.000Z | deposit    | 970        | 4535                     |
| 197         | 2020-03-25T00:00:00.000Z | deposit    | 994        | 5529                     |
| 197         | 2020-03-31T00:00:00.000Z | purchase   | 655        | 4737                     |
| 197         | 2020-03-31T00:00:00.000Z | purchase   | 137        | 4737                     |
| 197         | 2020-04-02T00:00:00.000Z | withdrawal | 39         | 4776                     |
| 197         | 2020-04-08T00:00:00.000Z | deposit    | 963        | 5739                     |
| 197         | 2020-04-11T00:00:00.000Z | purchase   | 257        | 6661                     |
| 197         | 2020-04-11T00:00:00.000Z | deposit    | 733        | 6661                     |
| 197         | 2020-04-11T00:00:00.000Z | deposit    | 446        | 6661                     |
| 197         | 2020-04-16T00:00:00.000Z | deposit    | 904        | 7565                     |
| 197         | 2020-04-17T00:00:00.000Z | purchase   | 88         | 7477                     |
| 198         | 2020-01-17T00:00:00.000Z | deposit    | 571        | 571                      |
| 198         | 2020-01-20T00:00:00.000Z | purchase   | 143        | 428                      |
| 198         | 2020-01-28T00:00:00.000Z | deposit    | 716        | 1144                     |
| 198         | 2020-02-02T00:00:00.000Z | purchase   | 248        | 896                      |
| 198         | 2020-02-15T00:00:00.000Z | deposit    | 303        | 1199                     |
| 198         | 2020-02-16T00:00:00.000Z | withdrawal | 203        | 1512                     |
| 198         | 2020-02-16T00:00:00.000Z | withdrawal | 110        | 1512                     |
| 198         | 2020-02-29T00:00:00.000Z | withdrawal | 598        | 2110                     |
| 198         | 2020-03-08T00:00:00.000Z | purchase   | 15         | 2095                     |
| 198         | 2020-03-17T00:00:00.000Z | withdrawal | 714        | 2809                     |
| 198         | 2020-03-20T00:00:00.000Z | purchase   | 498        | 2311                     |
| 198         | 2020-03-21T00:00:00.000Z | deposit    | 460        | 2771                     |
| 198         | 2020-03-25T00:00:00.000Z | purchase   | 553        | 2218                     |
| 198         | 2020-03-30T00:00:00.000Z | purchase   | 221        | 1997                     |
| 198         | 2020-04-15T00:00:00.000Z | deposit    | 496        | 2493                     |
| 199         | 2020-01-20T00:00:00.000Z | deposit    | 530        | 530                      |
| 199         | 2020-02-01T00:00:00.000Z | withdrawal | 687        | 1217                     |
| 199         | 2020-02-07T00:00:00.000Z | deposit    | 672        | 1889                     |
| 199         | 2020-03-06T00:00:00.000Z | purchase   | 529        | 1360                     |
| 199         | 2020-04-02T00:00:00.000Z | withdrawal | 661        | 2021                     |
| 199         | 2020-04-07T00:00:00.000Z | deposit    | 455        | 2476                     |
| 200         | 2020-01-29T00:00:00.000Z | deposit    | 997        | 997                      |
| 200         | 2020-02-07T00:00:00.000Z | withdrawal | 201        | 1198                     |
| 200         | 2020-02-11T00:00:00.000Z | withdrawal | 609        | 1807                     |
| 200         | 2020-02-18T00:00:00.000Z | deposit    | 904        | 2711                     |
| 200         | 2020-02-20T00:00:00.000Z | deposit    | 448        | 3159                     |
| 200         | 2020-02-24T00:00:00.000Z | withdrawal | 183        | 3342                     |
| 200         | 2020-03-09T00:00:00.000Z | purchase   | 143        | 3199                     |
| 200         | 2020-03-10T00:00:00.000Z | deposit    | 685        | 3884                     |
| 200         | 2020-03-19T00:00:00.000Z | deposit    | 143        | 4900                     |
| 200         | 2020-03-19T00:00:00.000Z | deposit    | 873        | 4900                     |
| 200         | 2020-04-13T00:00:00.000Z | deposit    | 247        | 5147                     |
| 200         | 2020-04-24T00:00:00.000Z | purchase   | 308        | 4839                     |
| 201         | 2020-01-02T00:00:00.000Z | deposit    | 646        | 646                      |
| 201         | 2020-01-20T00:00:00.000Z | purchase   | 564        | 82                       |
| 201         | 2020-01-25T00:00:00.000Z | purchase   | 442        | 272                      |
| 201         | 2020-01-25T00:00:00.000Z | deposit    | 632        | 272                      |
| 201         | 2020-01-26T00:00:00.000Z | purchase   | 655        | -383                     |
| 201         | 2020-02-05T00:00:00.000Z | deposit    | 261        | -122                     |
| 201         | 2020-02-24T00:00:00.000Z | purchase   | 78         | -200                     |
| 201         | 2020-02-28T00:00:00.000Z | withdrawal | 92         | -108                     |
| 201         | 2020-03-02T00:00:00.000Z | deposit    | 988        | 880                      |
| 201         | 2020-03-03T00:00:00.000Z | deposit    | 889        | 1769                     |
| 201         | 2020-03-04T00:00:00.000Z | deposit    | 610        | 2379                     |
| 201         | 2020-03-05T00:00:00.000Z | deposit    | 135        | 2514                     |
| 201         | 2020-03-09T00:00:00.000Z | withdrawal | 808        | 3322                     |
| 201         | 2020-03-12T00:00:00.000Z | purchase   | 941        | 2381                     |
| 201         | 2020-03-17T00:00:00.000Z | withdrawal | 362        | 2743                     |
| 201         | 2020-03-18T00:00:00.000Z | deposit    | 787        | 3530                     |
| 201         | 2020-03-19T00:00:00.000Z | deposit    | 523        | 4053                     |
| 202         | 2020-01-06T00:00:00.000Z | deposit    | 446        | 446                      |
| 202         | 2020-01-18T00:00:00.000Z | withdrawal | 763        | 1209                     |
| 202         | 2020-01-21T00:00:00.000Z | purchase   | 213        | 996                      |
| 202         | 2020-02-06T00:00:00.000Z | deposit    | 52         | 1072                     |
| 202         | 2020-02-06T00:00:00.000Z | deposit    | 24         | 1072                     |
| 202         | 2020-02-17T00:00:00.000Z | purchase   | 977        | 95                       |
| 202         | 2020-02-18T00:00:00.000Z | deposit    | 680        | 775                      |
| 202         | 2020-02-20T00:00:00.000Z | purchase   | 431        | 344                      |
| 202         | 2020-02-23T00:00:00.000Z | deposit    | 266        | 610                      |
| 202         | 2020-03-02T00:00:00.000Z | purchase   | 291        | 319                      |
| 202         | 2020-03-13T00:00:00.000Z | deposit    | 268        | 60                       |
| 202         | 2020-03-13T00:00:00.000Z | purchase   | 527        | 60                       |
| 202         | 2020-03-18T00:00:00.000Z | withdrawal | 135        | 862                      |
| 202         | 2020-03-18T00:00:00.000Z | deposit    | 667        | 862                      |
| 202         | 2020-03-27T00:00:00.000Z | withdrawal | 390        | 1252                     |
| 202         | 2020-03-29T00:00:00.000Z | purchase   | 934        | 318                      |
| 202         | 2020-03-31T00:00:00.000Z | withdrawal | 157        | 475                      |
| 203         | 2020-01-06T00:00:00.000Z | deposit    | 970        | 970                      |
| 203         | 2020-01-08T00:00:00.000Z | deposit    | 318        | 1288                     |
| 203         | 2020-01-09T00:00:00.000Z | purchase   | 650        | 638                      |
| 203         | 2020-01-18T00:00:00.000Z | deposit    | 812        | 1450                     |
| 203         | 2020-01-20T00:00:00.000Z | deposit    | 789        | 2239                     |
| 203         | 2020-01-25T00:00:00.000Z | deposit    | 293        | 2532                     |
| 203         | 2020-01-29T00:00:00.000Z | purchase   | 4          | 2528                     |
| 203         | 2020-02-05T00:00:00.000Z | withdrawal | 57         | 2585                     |
| 203         | 2020-02-07T00:00:00.000Z | deposit    | 862        | 3447                     |
| 203         | 2020-02-17T00:00:00.000Z | deposit    | 670        | 4117                     |
| 203         | 2020-02-21T00:00:00.000Z | withdrawal | 622        | 4739                     |
| 203         | 2020-02-26T00:00:00.000Z | purchase   | 416        | 4323                     |
| 203         | 2020-02-27T00:00:00.000Z | purchase   | 133        | 4190                     |
| 203         | 2020-02-29T00:00:00.000Z | deposit    | 639        | 4829                     |
| 203         | 2020-03-07T00:00:00.000Z | purchase   | 647        | 4182                     |
| 203         | 2020-03-10T00:00:00.000Z | purchase   | 358        | 3824                     |
| 203         | 2020-03-14T00:00:00.000Z | deposit    | 510        | 4334                     |
| 203         | 2020-03-16T00:00:00.000Z | deposit    | 404        | 4738                     |
| 203         | 2020-03-27T00:00:00.000Z | deposit    | 169        | 4907                     |
| 203         | 2020-03-29T00:00:00.000Z | deposit    | 520        | 5427                     |
| 203         | 2020-03-31T00:00:00.000Z | purchase   | 608        | 4819                     |
| 203         | 2020-04-04T00:00:00.000Z | withdrawal | 24         | 4843                     |
| 204         | 2020-01-28T00:00:00.000Z | deposit    | 749        | 749                      |
| 204         | 2020-02-24T00:00:00.000Z | deposit    | 290        | 1039                     |
| 204         | 2020-03-25T00:00:00.000Z | deposit    | 548        | 1587                     |
| 204         | 2020-04-04T00:00:00.000Z | deposit    | 306        | 1893                     |
| 205         | 2020-01-02T00:00:00.000Z | deposit    | 608        | 608                      |
| 205         | 2020-01-07T00:00:00.000Z | purchase   | 361        | 247                      |
| 205         | 2020-01-12T00:00:00.000Z | purchase   | 671        | -424                     |
| 205         | 2020-01-13T00:00:00.000Z | withdrawal | 296        | -128                     |
| 205         | 2020-01-14T00:00:00.000Z | withdrawal | 300        | 172                      |
| 205         | 2020-01-17T00:00:00.000Z | deposit    | 895        | 1067                     |
| 205         | 2020-01-19T00:00:00.000Z | deposit    | 743        | 1810                     |
| 205         | 2020-01-21T00:00:00.000Z | withdrawal | 451        | 2261                     |
| 205         | 2020-01-24T00:00:00.000Z | purchase   | 249        | 2012                     |
| 205         | 2020-02-02T00:00:00.000Z | withdrawal | 342        | 2354                     |
| 205         | 2020-02-03T00:00:00.000Z | deposit    | 767        | 3804                     |
| 205         | 2020-02-03T00:00:00.000Z | deposit    | 683        | 3804                     |
| 205         | 2020-02-07T00:00:00.000Z | withdrawal | 432        | 4236                     |
| 205         | 2020-02-14T00:00:00.000Z | withdrawal | 217        | 4453                     |
| 205         | 2020-02-15T00:00:00.000Z | deposit    | 116        | 4569                     |
| 205         | 2020-02-16T00:00:00.000Z | deposit    | 745        | 5314                     |
| 205         | 2020-02-20T00:00:00.000Z | deposit    | 560        | 5874                     |
| 205         | 2020-02-22T00:00:00.000Z | withdrawal | 587        | 6461                     |
| 205         | 2020-03-15T00:00:00.000Z | purchase   | 144        | 6317                     |
| 206         | 2020-01-09T00:00:00.000Z | deposit    | 811        | 811                      |
| 206         | 2020-01-12T00:00:00.000Z | withdrawal | 429        | 1240                     |
| 206         | 2020-01-14T00:00:00.000Z | purchase   | 169        | 1071                     |
| 206         | 2020-01-18T00:00:00.000Z | withdrawal | 768        | 1839                     |
| 206         | 2020-01-19T00:00:00.000Z | deposit    | 340        | 2179                     |
| 206         | 2020-02-22T00:00:00.000Z | purchase   | 734        | 1445                     |
| 206         | 2020-03-02T00:00:00.000Z | withdrawal | 766        | 2211                     |
| 206         | 2020-03-07T00:00:00.000Z | withdrawal | 168        | 2379                     |
| 206         | 2020-03-08T00:00:00.000Z | withdrawal | 183        | 2562                     |
| 206         | 2020-03-15T00:00:00.000Z | withdrawal | 915        | 3477                     |
| 206         | 2020-03-18T00:00:00.000Z | purchase   | 516        | 2961                     |
| 206         | 2020-03-26T00:00:00.000Z | purchase   | 738        | 2223                     |
| 206         | 2020-03-29T00:00:00.000Z | purchase   | 428        | 1795                     |
| 206         | 2020-03-30T00:00:00.000Z | purchase   | 311        | 1484                     |
| 206         | 2020-04-04T00:00:00.000Z | withdrawal | 400        | 1884                     |
| 207         | 2020-01-26T00:00:00.000Z | deposit    | 322        | 322                      |
| 207         | 2020-02-04T00:00:00.000Z | withdrawal | 754        | 1076                     |
| 207         | 2020-02-12T00:00:00.000Z | purchase   | 45         | 1031                     |
| 207         | 2020-02-14T00:00:00.000Z | deposit    | 373        | 1404                     |
| 207         | 2020-02-23T00:00:00.000Z | withdrawal | 902        | 2306                     |
| 207         | 2020-02-28T00:00:00.000Z | withdrawal | 948        | 3254                     |
| 207         | 2020-03-01T00:00:00.000Z | withdrawal | 237        | 3491                     |
| 207         | 2020-03-02T00:00:00.000Z | deposit    | 668        | 4159                     |
| 207         | 2020-03-06T00:00:00.000Z | deposit    | 224        | 4383                     |
| 207         | 2020-03-09T00:00:00.000Z | withdrawal | 536        | 4919                     |
| 207         | 2020-03-17T00:00:00.000Z | withdrawal | 317        | 5236                     |
| 207         | 2020-04-11T00:00:00.000Z | deposit    | 798        | 6034                     |
| 207         | 2020-04-13T00:00:00.000Z | deposit    | 340        | 6374                     |
| 208         | 2020-01-19T00:00:00.000Z | deposit    | 537        | 537                      |
| 208         | 2020-02-04T00:00:00.000Z | purchase   | 131        | 406                      |
| 208         | 2020-04-17T00:00:00.000Z | deposit    | 955        | 1361                     |
| 209         | 2020-01-23T00:00:00.000Z | deposit    | 160        | 160                      |
| 209         | 2020-01-24T00:00:00.000Z | purchase   | 363        | -203                     |
| 209         | 2020-01-25T00:00:00.000Z | deposit    | 904        | 701                      |
| 209         | 2020-01-30T00:00:00.000Z | withdrawal | 903        | 1604                     |
| 209         | 2020-02-22T00:00:00.000Z | withdrawal | 738        | 2342                     |
| 209         | 2020-02-24T00:00:00.000Z | deposit    | 174        | 2516                     |
| 209         | 2020-03-01T00:00:00.000Z | withdrawal | 430        | 2946                     |
| 209         | 2020-03-08T00:00:00.000Z | deposit    | 522        | 3468                     |
| 209         | 2020-03-14T00:00:00.000Z | deposit    | 909        | 3464                     |
| 209         | 2020-03-14T00:00:00.000Z | purchase   | 913        | 3464                     |
| 209         | 2020-03-21T00:00:00.000Z | withdrawal | 66         | 3530                     |
| 209         | 2020-03-30T00:00:00.000Z | purchase   | 522        | 3008                     |
| 209         | 2020-04-03T00:00:00.000Z | withdrawal | 501        | 3509                     |
| 209         | 2020-04-19T00:00:00.000Z | withdrawal | 584        | 4093                     |
| 210         | 2020-01-19T00:00:00.000Z | deposit    | 708        | 708                      |
| 210         | 2020-01-20T00:00:00.000Z | deposit    | 103        | 811                      |
| 210         | 2020-01-29T00:00:00.000Z | withdrawal | 751        | 1562                     |
| 210         | 2020-02-05T00:00:00.000Z | purchase   | 883        | 679                      |
| 210         | 2020-02-06T00:00:00.000Z | withdrawal | 486        | 1165                     |
| 210         | 2020-02-16T00:00:00.000Z | withdrawal | 17         | 1182                     |
| 210         | 2020-02-19T00:00:00.000Z | withdrawal | 267        | 1807                     |
| 210         | 2020-02-19T00:00:00.000Z | withdrawal | 358        | 1807                     |
| 210         | 2020-02-21T00:00:00.000Z | withdrawal | 678        | 2485                     |
| 210         | 2020-02-23T00:00:00.000Z | deposit    | 422        | 2907                     |
| 210         | 2020-02-26T00:00:00.000Z | deposit    | 203        | 3689                     |
| 210         | 2020-02-26T00:00:00.000Z | deposit    | 579        | 3689                     |
| 210         | 2020-02-27T00:00:00.000Z | deposit    | 64         | 3753                     |
| 210         | 2020-03-06T00:00:00.000Z | withdrawal | 926        | 4679                     |
| 210         | 2020-03-09T00:00:00.000Z | deposit    | 782        | 5461                     |
| 210         | 2020-03-11T00:00:00.000Z | deposit    | 662        | 6123                     |
| 210         | 2020-03-12T00:00:00.000Z | deposit    | 698        | 6821                     |
| 210         | 2020-03-26T00:00:00.000Z | withdrawal | 491        | 7312                     |
| 210         | 2020-03-31T00:00:00.000Z | withdrawal | 673        | 7985                     |
| 210         | 2020-04-08T00:00:00.000Z | deposit    | 517        | 8502                     |
| 211         | 2020-01-19T00:00:00.000Z | deposit    | 485        | 485                      |
| 211         | 2020-01-24T00:00:00.000Z | deposit    | 529        | 607                      |
| 211         | 2020-01-24T00:00:00.000Z | purchase   | 407        | 607                      |
| 211         | 2020-02-02T00:00:00.000Z | deposit    | 658        | 1265                     |
| 211         | 2020-02-10T00:00:00.000Z | withdrawal | 244        | 1509                     |
| 211         | 2020-02-17T00:00:00.000Z | withdrawal | 718        | 3028                     |
| 211         | 2020-02-17T00:00:00.000Z | deposit    | 801        | 3028                     |
| 211         | 2020-02-26T00:00:00.000Z | deposit    | 735        | 3763                     |
| 211         | 2020-03-02T00:00:00.000Z | purchase   | 296        | 3467                     |
| 211         | 2020-03-05T00:00:00.000Z | deposit    | 791        | 4258                     |
| 211         | 2020-03-16T00:00:00.000Z | deposit    | 141        | 4399                     |
| 211         | 2020-03-17T00:00:00.000Z | deposit    | 631        | 5030                     |
| 211         | 2020-03-20T00:00:00.000Z | withdrawal | 822        | 5773                     |
| 211         | 2020-03-20T00:00:00.000Z | purchase   | 79         | 5773                     |
| 211         | 2020-03-21T00:00:00.000Z | withdrawal | 856        | 6629                     |
| 211         | 2020-03-23T00:00:00.000Z | withdrawal | 278        | 6907                     |
| 211         | 2020-03-28T00:00:00.000Z | withdrawal | 814        | 7721                     |
| 211         | 2020-04-03T00:00:00.000Z | purchase   | 333        | 7388                     |
| 211         | 2020-04-12T00:00:00.000Z | withdrawal | 526        | 7914                     |
| 212         | 2020-01-02T00:00:00.000Z | deposit    | 336        | 336                      |
| 212         | 2020-01-13T00:00:00.000Z | withdrawal | 159        | 495                      |
| 212         | 2020-01-21T00:00:00.000Z | withdrawal | 482        | 977                      |
| 212         | 2020-01-23T00:00:00.000Z | withdrawal | 31         | 1008                     |
| 212         | 2020-02-14T00:00:00.000Z | deposit    | 740        | 1748                     |
| 212         | 2020-02-19T00:00:00.000Z | deposit    | 235        | 1983                     |
| 212         | 2020-02-25T00:00:00.000Z | withdrawal | 442        | 2425                     |
| 212         | 2020-02-26T00:00:00.000Z | withdrawal | 127        | 2552                     |
| 212         | 2020-02-28T00:00:00.000Z | deposit    | 16         | 2568                     |
| 212         | 2020-02-29T00:00:00.000Z | deposit    | 395        | 2963                     |
| 212         | 2020-03-02T00:00:00.000Z | deposit    | 683        | 3646                     |
| 212         | 2020-03-04T00:00:00.000Z | purchase   | 453        | 4103                     |
| 212         | 2020-03-04T00:00:00.000Z | deposit    | 910        | 4103                     |
| 212         | 2020-03-12T00:00:00.000Z | purchase   | 74         | 4029                     |
| 212         | 2020-03-14T00:00:00.000Z | deposit    | 521        | 4550                     |
| 212         | 2020-03-22T00:00:00.000Z | deposit    | 500        | 5050                     |
| 212         | 2020-03-31T00:00:00.000Z | deposit    | 961        | 6011                     |
| 213         | 2020-01-17T00:00:00.000Z | deposit    | 421        | 421                      |
| 213         | 2020-01-21T00:00:00.000Z | purchase   | 942        | -521                     |
| 213         | 2020-01-22T00:00:00.000Z | withdrawal | 265        | -256                     |
| 213         | 2020-01-28T00:00:00.000Z | deposit    | 547        | 291                      |
| 213         | 2020-02-08T00:00:00.000Z | deposit    | 143        | 434                      |
| 213         | 2020-02-10T00:00:00.000Z | withdrawal | 196        | 630                      |
| 213         | 2020-02-13T00:00:00.000Z | purchase   | 949        | -319                     |
| 213         | 2020-02-15T00:00:00.000Z | deposit    | 229        | -90                      |
| 213         | 2020-02-23T00:00:00.000Z | purchase   | 187        | -277                     |
| 213         | 2020-03-21T00:00:00.000Z | deposit    | 562        | 285                      |
| 213         | 2020-03-23T00:00:00.000Z | withdrawal | 4          | -254                     |
| 213         | 2020-03-23T00:00:00.000Z | purchase   | 543        | -254                     |
| 213         | 2020-04-14T00:00:00.000Z | purchase   | 533        | -787                     |
| 214         | 2020-01-14T00:00:00.000Z | deposit    | 325        | 325                      |
| 214         | 2020-01-20T00:00:00.000Z | deposit    | 191        | 516                      |
| 214         | 2020-01-21T00:00:00.000Z | purchase   | 940        | -424                     |
| 214         | 2020-01-31T00:00:00.000Z | purchase   | 21         | -445                     |
| 214         | 2020-02-12T00:00:00.000Z | withdrawal | 645        | 200                      |
| 214         | 2020-02-21T00:00:00.000Z | withdrawal | 626        | 826                      |
| 214         | 2020-02-22T00:00:00.000Z | withdrawal | 233        | 1059                     |
| 214         | 2020-02-23T00:00:00.000Z | deposit    | 438        | 1497                     |
| 214         | 2020-03-02T00:00:00.000Z | deposit    | 698        | 2195                     |
| 214         | 2020-03-04T00:00:00.000Z | deposit    | 116        | 2311                     |
| 214         | 2020-03-05T00:00:00.000Z | deposit    | 780        | 3091                     |
| 214         | 2020-04-06T00:00:00.000Z | purchase   | 546        | 2545                     |
| 214         | 2020-04-07T00:00:00.000Z | deposit    | 918        | 3463                     |
| 214         | 2020-04-10T00:00:00.000Z | deposit    | 347        | 3810                     |
| 215         | 2020-01-27T00:00:00.000Z | deposit    | 822        | 822                      |
| 215         | 2020-02-13T00:00:00.000Z | deposit    | 157        | 979                      |
| 215         | 2020-02-15T00:00:00.000Z | deposit    | 813        | 1792                     |
| 215         | 2020-02-21T00:00:00.000Z | purchase   | 34         | 1758                     |
| 215         | 2020-02-25T00:00:00.000Z | purchase   | 966        | 792                      |
| 215         | 2020-02-28T00:00:00.000Z | deposit    | 978        | 1770                     |
| 215         | 2020-03-05T00:00:00.000Z | purchase   | 212        | 1558                     |
| 215         | 2020-03-13T00:00:00.000Z | purchase   | 861        | 697                      |
| 215         | 2020-04-16T00:00:00.000Z | withdrawal | 283        | 980                      |
| 216         | 2020-01-04T00:00:00.000Z | deposit    | 567        | 707                      |
| 216         | 2020-01-04T00:00:00.000Z | deposit    | 140        | 707                      |
| 216         | 2020-01-05T00:00:00.000Z | deposit    | 721        | 1050                     |
| 216         | 2020-01-05T00:00:00.000Z | purchase   | 378        | 1050                     |
| 216         | 2020-01-10T00:00:00.000Z | withdrawal | 673        | 1723                     |
| 216         | 2020-01-15T00:00:00.000Z | deposit    | 763        | 2486                     |
| 216         | 2020-01-30T00:00:00.000Z | deposit    | 479        | 2965                     |
| 216         | 2020-02-02T00:00:00.000Z | deposit    | 913        | 3878                     |
| 216         | 2020-02-06T00:00:00.000Z | deposit    | 889        | 4767                     |
| 216         | 2020-02-12T00:00:00.000Z | deposit    | 201        | 4968                     |
| 216         | 2020-02-14T00:00:00.000Z | deposit    | 766        | 5734                     |
| 216         | 2020-02-23T00:00:00.000Z | withdrawal | 780        | 6514                     |
| 216         | 2020-02-29T00:00:00.000Z | withdrawal | 306        | 6820                     |
| 216         | 2020-03-09T00:00:00.000Z | purchase   | 931        | 5889                     |
| 216         | 2020-03-17T00:00:00.000Z | withdrawal | 648        | 6537                     |
| 216         | 2020-03-21T00:00:00.000Z | withdrawal | 181        | 6718                     |
| 216         | 2020-03-26T00:00:00.000Z | withdrawal | 350        | 7388                     |
| 216         | 2020-03-26T00:00:00.000Z | withdrawal | 320        | 7388                     |
| 216         | 2020-04-01T00:00:00.000Z | purchase   | 982        | 6406                     |
| 217         | 2020-01-08T00:00:00.000Z | deposit    | 783        | 783                      |
| 217         | 2020-01-09T00:00:00.000Z | withdrawal | 281        | 1064                     |
| 217         | 2020-01-17T00:00:00.000Z | deposit    | 847        | 2578                     |
| 217         | 2020-01-17T00:00:00.000Z | withdrawal | 667        | 2578                     |
| 217         | 2020-01-23T00:00:00.000Z | deposit    | 188        | 2766                     |
| 217         | 2020-02-01T00:00:00.000Z | deposit    | 304        | 3070                     |
| 217         | 2020-02-13T00:00:00.000Z | deposit    | 874        | 3944                     |
| 217         | 2020-02-15T00:00:00.000Z | purchase   | 15         | 3929                     |
| 217         | 2020-02-16T00:00:00.000Z | withdrawal | 909        | 4838                     |
| 217         | 2020-02-17T00:00:00.000Z | deposit    | 299        | 5137                     |
| 217         | 2020-02-21T00:00:00.000Z | deposit    | 475        | 5612                     |
| 217         | 2020-02-23T00:00:00.000Z | withdrawal | 582        | 6194                     |
| 217         | 2020-02-26T00:00:00.000Z | withdrawal | 99         | 6293                     |
| 217         | 2020-02-29T00:00:00.000Z | deposit    | 622        | 6915                     |
| 217         | 2020-03-13T00:00:00.000Z | withdrawal | 555        | 7470                     |
| 217         | 2020-03-15T00:00:00.000Z | deposit    | 713        | 8183                     |
| 217         | 2020-03-25T00:00:00.000Z | purchase   | 487        | 7696                     |
| 217         | 2020-03-26T00:00:00.000Z | deposit    | 35         | 7731                     |
| 217         | 2020-03-27T00:00:00.000Z | withdrawal | 951        | 8682                     |
| 217         | 2020-03-31T00:00:00.000Z | purchase   | 585        | 8097                     |
| 218         | 2020-01-29T00:00:00.000Z | deposit    | 208        | 208                      |
| 218         | 2020-02-09T00:00:00.000Z | purchase   | 805        | -597                     |
| 218         | 2020-02-12T00:00:00.000Z | purchase   | 697        | -1294                    |
| 218         | 2020-02-13T00:00:00.000Z | purchase   | 933        | -2227                    |
| 218         | 2020-02-16T00:00:00.000Z | purchase   | 142        | -2369                    |
| 218         | 2020-02-28T00:00:00.000Z | deposit    | 749        | -1620                    |
| 218         | 2020-03-02T00:00:00.000Z | withdrawal | 146        | -1474                    |
| 218         | 2020-03-03T00:00:00.000Z | deposit    | 1000       | -474                     |
| 218         | 2020-03-04T00:00:00.000Z | deposit    | 67         | -407                     |
| 218         | 2020-03-05T00:00:00.000Z | deposit    | 33         | -374                     |
| 218         | 2020-03-08T00:00:00.000Z | withdrawal | 774        | 983                      |
| 218         | 2020-03-08T00:00:00.000Z | deposit    | 583        | 983                      |
| 218         | 2020-03-10T00:00:00.000Z | deposit    | 829        | 1812                     |
| 218         | 2020-03-13T00:00:00.000Z | purchase   | 894        | 918                      |
| 218         | 2020-03-15T00:00:00.000Z | deposit    | 80         | 1764                     |
| 218         | 2020-03-15T00:00:00.000Z | deposit    | 766        | 1764                     |
| 218         | 2020-03-19T00:00:00.000Z | deposit    | 333        | 2097                     |
| 218         | 2020-03-22T00:00:00.000Z | purchase   | 494        | 1603                     |
| 218         | 2020-03-23T00:00:00.000Z | purchase   | 228        | 1375                     |
| 218         | 2020-04-04T00:00:00.000Z | deposit    | 835        | 2210                     |
| 218         | 2020-04-10T00:00:00.000Z | withdrawal | 80         | 2290                     |
| 218         | 2020-04-19T00:00:00.000Z | deposit    | 877        | 3167                     |
| 219         | 2020-01-06T00:00:00.000Z | purchase   | 274        | 145                      |
| 219         | 2020-01-06T00:00:00.000Z | deposit    | 419        | 145                      |
| 219         | 2020-01-10T00:00:00.000Z | deposit    | 20         | 165                      |
| 219         | 2020-02-13T00:00:00.000Z | purchase   | 142        | 23                       |
| 219         | 2020-02-15T00:00:00.000Z | purchase   | 428        | -405                     |
| 219         | 2020-02-17T00:00:00.000Z | withdrawal | 609        | 204                      |
| 219         | 2020-02-24T00:00:00.000Z | withdrawal | 282        | 486                      |
| 219         | 2020-02-26T00:00:00.000Z | deposit    | 93         | 579                      |
| 219         | 2020-02-27T00:00:00.000Z | withdrawal | 256        | 835                      |
| 219         | 2020-02-28T00:00:00.000Z | deposit    | 614        | 1449                     |
| 219         | 2020-03-01T00:00:00.000Z | deposit    | 1000       | 2449                     |
| 219         | 2020-03-21T00:00:00.000Z | deposit    | 502        | 2951                     |
| 219         | 2020-03-22T00:00:00.000Z | deposit    | 489        | 3440                     |
| 219         | 2020-03-24T00:00:00.000Z | purchase   | 291        | 3149                     |
| 219         | 2020-03-29T00:00:00.000Z | deposit    | 253        | 3402                     |
| 219         | 2020-04-03T00:00:00.000Z | purchase   | 802        | 2600                     |
| 220         | 2020-01-21T00:00:00.000Z | deposit    | 307        | 307                      |
| 220         | 2020-02-02T00:00:00.000Z | deposit    | 776        | 1083                     |
| 220         | 2020-02-09T00:00:00.000Z | purchase   | 465        | 618                      |
| 220         | 2020-02-16T00:00:00.000Z | deposit    | 514        | 1132                     |
| 220         | 2020-02-26T00:00:00.000Z | withdrawal | 418        | 1550                     |
| 220         | 2020-03-19T00:00:00.000Z | deposit    | 579        | 2129                     |
| 220         | 2020-03-23T00:00:00.000Z | purchase   | 350        | 1779                     |
| 220         | 2020-03-29T00:00:00.000Z | purchase   | 972        | 807                      |
| 220         | 2020-04-01T00:00:00.000Z | deposit    | 326        | 1133                     |
| 220         | 2020-04-05T00:00:00.000Z | withdrawal | 657        | 1790                     |
| 220         | 2020-04-06T00:00:00.000Z | withdrawal | 762        | 2552                     |
| 220         | 2020-04-13T00:00:00.000Z | deposit    | 164        | 2716                     |
| 221         | 2020-01-06T00:00:00.000Z | deposit    | 147        | 147                      |
| 221         | 2020-01-17T00:00:00.000Z | deposit    | 112        | 259                      |
| 221         | 2020-01-21T00:00:00.000Z | purchase   | 14         | 245                      |
| 221         | 2020-01-23T00:00:00.000Z | deposit    | 256        | 501                      |
| 221         | 2020-01-24T00:00:00.000Z | deposit    | 883        | 1384                     |
| 221         | 2020-02-24T00:00:00.000Z | deposit    | 508        | 1892                     |
| 221         | 2020-02-27T00:00:00.000Z | purchase   | 411        | 1481                     |
| 221         | 2020-03-07T00:00:00.000Z | withdrawal | 427        | 2220                     |
| 221         | 2020-03-07T00:00:00.000Z | deposit    | 312        | 2220                     |
| 221         | 2020-03-08T00:00:00.000Z | purchase   | 136        | 2084                     |
| 221         | 2020-03-14T00:00:00.000Z | purchase   | 175        | 1909                     |
| 222         | 2020-01-11T00:00:00.000Z | deposit    | 311        | 311                      |
| 222         | 2020-01-25T00:00:00.000Z | deposit    | 57         | 368                      |
| 222         | 2020-01-27T00:00:00.000Z | deposit    | 289        | 657                      |
| 222         | 2020-02-04T00:00:00.000Z | deposit    | 245        | 902                      |
| 222         | 2020-02-17T00:00:00.000Z | deposit    | 925        | 1827                     |
| 222         | 2020-02-19T00:00:00.000Z | deposit    | 640        | 3034                     |
| 222         | 2020-02-19T00:00:00.000Z | withdrawal | 567        | 3034                     |
| 222         | 2020-02-21T00:00:00.000Z | deposit    | 97         | 3131                     |
| 222         | 2020-03-08T00:00:00.000Z | purchase   | 861        | 2270                     |
| 222         | 2020-04-09T00:00:00.000Z | deposit    | 396        | 2666                     |
| 223         | 2020-01-11T00:00:00.000Z | deposit    | 431        | 431                      |
| 223         | 2020-01-14T00:00:00.000Z | deposit    | 813        | 1244                     |
| 223         | 2020-01-23T00:00:00.000Z | withdrawal | 948        | 2192                     |
| 223         | 2020-01-26T00:00:00.000Z | deposit    | 336        | 2528                     |
| 223         | 2020-01-27T00:00:00.000Z | purchase   | 268        | 2260                     |
| 223         | 2020-01-31T00:00:00.000Z | deposit    | 32         | 2292                     |
| 223         | 2020-02-02T00:00:00.000Z | purchase   | 956        | 1336                     |
| 223         | 2020-02-12T00:00:00.000Z | withdrawal | 540        | 1876                     |
| 223         | 2020-03-01T00:00:00.000Z | purchase   | 364        | 1512                     |
| 223         | 2020-03-05T00:00:00.000Z | withdrawal | 822        | 2334                     |
| 223         | 2020-03-06T00:00:00.000Z | deposit    | 956        | 3290                     |
| 223         | 2020-03-11T00:00:00.000Z | deposit    | 24         | 3314                     |
| 223         | 2020-03-18T00:00:00.000Z | deposit    | 139        | 3453                     |
| 223         | 2020-03-20T00:00:00.000Z | withdrawal | 257        | 3710                     |
| 223         | 2020-03-26T00:00:00.000Z | withdrawal | 846        | 4556                     |
| 223         | 2020-03-29T00:00:00.000Z | purchase   | 25         | 5103                     |
| 223         | 2020-03-29T00:00:00.000Z | deposit    | 572        | 5103                     |
| 223         | 2020-04-06T00:00:00.000Z | deposit    | 490        | 4723                     |
| 223         | 2020-04-06T00:00:00.000Z | purchase   | 870        | 4723                     |
| 223         | 2020-04-09T00:00:00.000Z | withdrawal | 332        | 5055                     |
| 224         | 2020-01-21T00:00:00.000Z | deposit    | 487        | 487                      |
| 224         | 2020-02-13T00:00:00.000Z | purchase   | 491        | -4                       |
| 224         | 2020-02-14T00:00:00.000Z | purchase   | 765        | -769                     |
| 224         | 2020-02-20T00:00:00.000Z | deposit    | 899        | 130                      |
| 224         | 2020-02-22T00:00:00.000Z | purchase   | 336        | -206                     |
| 224         | 2020-03-12T00:00:00.000Z | withdrawal | 907        | 701                      |
| 224         | 2020-03-13T00:00:00.000Z | deposit    | 883        | 1584                     |
| 224         | 2020-03-26T00:00:00.000Z | deposit    | 486        | 2070                     |
| 224         | 2020-03-28T00:00:00.000Z | purchase   | 910        | 1160                     |
| 224         | 2020-03-31T00:00:00.000Z | withdrawal | 927        | 2087                     |
| 224         | 2020-04-04T00:00:00.000Z | deposit    | 212        | 2299                     |
| 225         | 2020-01-10T00:00:00.000Z | deposit    | 280        | 280                      |
| 225         | 2020-02-13T00:00:00.000Z | deposit    | 489        | 769                      |
| 225         | 2020-02-29T00:00:00.000Z | withdrawal | 858        | 1627                     |
| 225         | 2020-03-11T00:00:00.000Z | deposit    | 567        | 2194                     |
| 225         | 2020-03-26T00:00:00.000Z | withdrawal | 75         | 2269                     |
| 225         | 2020-03-28T00:00:00.000Z | purchase   | 106        | 2163                     |
| 226         | 2020-01-11T00:00:00.000Z | deposit    | 854        | 854                      |
| 226         | 2020-01-17T00:00:00.000Z | withdrawal | 762        | 1616                     |
| 226         | 2020-01-19T00:00:00.000Z | purchase   | 930        | 686                      |
| 226         | 2020-01-23T00:00:00.000Z | deposit    | 529        | 1215                     |
| 226         | 2020-01-29T00:00:00.000Z | withdrawal | 671        | 1886                     |
| 226         | 2020-02-01T00:00:00.000Z | deposit    | 485        | 2371                     |
| 226         | 2020-02-06T00:00:00.000Z | deposit    | 427        | 2798                     |
| 226         | 2020-02-12T00:00:00.000Z | purchase   | 47         | 2056                     |
| 226         | 2020-02-12T00:00:00.000Z | deposit    | 262        | 2056                     |
| 226         | 2020-02-12T00:00:00.000Z | purchase   | 757        | 2056                     |
| 226         | 2020-02-12T00:00:00.000Z | purchase   | 200        | 2056                     |
| 226         | 2020-02-25T00:00:00.000Z | deposit    | 560        | 2616                     |
| 226         | 2020-02-26T00:00:00.000Z | purchase   | 336        | 2280                     |
| 226         | 2020-03-14T00:00:00.000Z | withdrawal | 479        | 2759                     |
| 226         | 2020-03-18T00:00:00.000Z | withdrawal | 320        | 2133                     |
| 226         | 2020-03-18T00:00:00.000Z | purchase   | 946        | 2133                     |
| 226         | 2020-03-25T00:00:00.000Z | deposit    | 429        | 2562                     |
| 226         | 2020-03-30T00:00:00.000Z | withdrawal | 231        | 2793                     |
| 226         | 2020-03-31T00:00:00.000Z | deposit    | 278        | 3071                     |
| 226         | 2020-04-01T00:00:00.000Z | withdrawal | 356        | 3427                     |
| 226         | 2020-04-03T00:00:00.000Z | purchase   | 73         | 3354                     |
| 226         | 2020-04-07T00:00:00.000Z | deposit    | 854        | 4208                     |
| 227         | 2020-01-07T00:00:00.000Z | deposit    | 468        | 468                      |
| 227         | 2020-01-12T00:00:00.000Z | withdrawal | 819        | 1287                     |
| 227         | 2020-01-24T00:00:00.000Z | purchase   | 271        | 1016                     |
| 227         | 2020-02-03T00:00:00.000Z | withdrawal | 872        | 1888                     |
| 227         | 2020-02-24T00:00:00.000Z | deposit    | 449        | 2337                     |
| 227         | 2020-03-01T00:00:00.000Z | purchase   | 537        | 1800                     |
| 227         | 2020-03-10T00:00:00.000Z | deposit    | 393        | 2193                     |
| 227         | 2020-03-16T00:00:00.000Z | purchase   | 559        | 1634                     |
| 227         | 2020-03-21T00:00:00.000Z | withdrawal | 106        | 1740                     |
| 227         | 2020-03-22T00:00:00.000Z | withdrawal | 482        | 2222                     |
| 227         | 2020-04-04T00:00:00.000Z | withdrawal | 825        | 3047                     |
| 228         | 2020-01-10T00:00:00.000Z | deposit    | 294        | 294                      |
| 228         | 2020-02-27T00:00:00.000Z | withdrawal | 547        | 841                      |
| 228         | 2020-03-28T00:00:00.000Z | purchase   | 760        | 81                       |
| 228         | 2020-03-30T00:00:00.000Z | purchase   | 711        | -630                     |
| 229         | 2020-01-23T00:00:00.000Z | deposit    | 180        | 180                      |
| 229         | 2020-01-30T00:00:00.000Z | deposit    | 441        | 621                      |
| 229         | 2020-02-19T00:00:00.000Z | deposit    | 997        | 1618                     |
| 229         | 2020-03-16T00:00:00.000Z | purchase   | 915        | 703                      |
| 230         | 2020-01-21T00:00:00.000Z | deposit    | 675        | 675                      |
| 230         | 2020-01-28T00:00:00.000Z | withdrawal | 176        | 851                      |
| 230         | 2020-02-08T00:00:00.000Z | withdrawal | 108        | 959                      |
| 230         | 2020-02-09T00:00:00.000Z | deposit    | 959        | 1918                     |
| 230         | 2020-02-25T00:00:00.000Z | purchase   | 360        | 1558                     |
| 230         | 2020-03-02T00:00:00.000Z | deposit    | 35         | 1593                     |
| 230         | 2020-03-19T00:00:00.000Z | deposit    | 527        | 2120                     |
| 230         | 2020-03-24T00:00:00.000Z | deposit    | 876        | 2996                     |
| 230         | 2020-04-06T00:00:00.000Z | withdrawal | 72         | 3068                     |
| 231         | 2020-01-20T00:00:00.000Z | deposit    | 122        | 122                      |
| 231         | 2020-01-28T00:00:00.000Z | withdrawal | 120        | 242                      |
| 231         | 2020-01-30T00:00:00.000Z | purchase   | 238        | 4                        |
| 231         | 2020-02-07T00:00:00.000Z | withdrawal | 64         | 68                       |
| 231         | 2020-02-14T00:00:00.000Z | withdrawal | 572        | 640                      |
| 231         | 2020-02-16T00:00:00.000Z | deposit    | 736        | 1376                     |
| 231         | 2020-02-22T00:00:00.000Z | purchase   | 398        | 978                      |
| 231         | 2020-03-02T00:00:00.000Z | withdrawal | 199        | 1177                     |
| 231         | 2020-03-06T00:00:00.000Z | purchase   | 952        | 225                      |
| 231         | 2020-03-13T00:00:00.000Z | purchase   | 258        | -33                      |
| 231         | 2020-03-31T00:00:00.000Z | withdrawal | 67         | 34                       |
| 231         | 2020-04-04T00:00:00.000Z | deposit    | 22         | 56                       |
| 231         | 2020-04-09T00:00:00.000Z | withdrawal | 487        | 543                      |
| 232         | 2020-01-02T00:00:00.000Z | deposit    | 843        | 843                      |
| 232         | 2020-01-11T00:00:00.000Z | deposit    | 833        | 1676                     |
| 232         | 2020-01-23T00:00:00.000Z | deposit    | 551        | 2227                     |
| 232         | 2020-01-27T00:00:00.000Z | purchase   | 809        | 1418                     |
| 232         | 2020-02-08T00:00:00.000Z | purchase   | 227        | 1191                     |
| 232         | 2020-02-10T00:00:00.000Z | withdrawal | 54         | 1656                     |
| 232         | 2020-02-10T00:00:00.000Z | deposit    | 411        | 1656                     |
| 232         | 2020-02-16T00:00:00.000Z | purchase   | 612        | 542                      |
| 232         | 2020-02-16T00:00:00.000Z | purchase   | 502        | 542                      |
| 232         | 2020-02-20T00:00:00.000Z | deposit    | 227        | 769                      |
| 232         | 2020-02-21T00:00:00.000Z | withdrawal | 252        | 1021                     |
| 232         | 2020-02-27T00:00:00.000Z | deposit    | 455        | 1476                     |
| 232         | 2020-03-06T00:00:00.000Z | withdrawal | 738        | 2214                     |
| 232         | 2020-03-09T00:00:00.000Z | purchase   | 22         | 2192                     |
| 232         | 2020-03-28T00:00:00.000Z | deposit    | 584        | 2776                     |
| 232         | 2020-03-30T00:00:00.000Z | deposit    | 235        | 3011                     |
| 233         | 2020-01-03T00:00:00.000Z | deposit    | 187        | 187                      |
| 233         | 2020-01-08T00:00:00.000Z | deposit    | 833        | 1020                     |
| 233         | 2020-01-17T00:00:00.000Z | deposit    | 801        | 1821                     |
| 233         | 2020-01-21T00:00:00.000Z | purchase   | 471        | 1350                     |
| 233         | 2020-01-23T00:00:00.000Z | deposit    | 445        | 1795                     |
| 233         | 2020-02-08T00:00:00.000Z | deposit    | 234        | 2029                     |
| 233         | 2020-02-12T00:00:00.000Z | deposit    | 837        | 2866                     |
| 233         | 2020-02-14T00:00:00.000Z | deposit    | 572        | 3438                     |
| 233         | 2020-02-28T00:00:00.000Z | purchase   | 528        | 2910                     |
| 233         | 2020-03-01T00:00:00.000Z | deposit    | 832        | 3742                     |
| 234         | 2020-01-03T00:00:00.000Z | deposit    | 236        | 236                      |
| 234         | 2020-01-04T00:00:00.000Z | deposit    | 295        | 397                      |
| 234         | 2020-01-04T00:00:00.000Z | purchase   | 134        | 397                      |
| 234         | 2020-01-06T00:00:00.000Z | deposit    | 418        | 815                      |
| 234         | 2020-01-16T00:00:00.000Z | purchase   | 937        | -122                     |
| 234         | 2020-01-24T00:00:00.000Z | purchase   | 76         | -198                     |
| 234         | 2020-01-28T00:00:00.000Z | purchase   | 2          | -200                     |
| 234         | 2020-02-01T00:00:00.000Z | withdrawal | 110        | -90                      |
| 234         | 2020-02-02T00:00:00.000Z | withdrawal | 250        | 160                      |
| 234         | 2020-02-18T00:00:00.000Z | purchase   | 834        | -674                     |
| 234         | 2020-02-22T00:00:00.000Z | deposit    | 567        | -107                     |
| 234         | 2020-02-24T00:00:00.000Z | deposit    | 222        | 115                      |
| 234         | 2020-02-29T00:00:00.000Z | deposit    | 927        | 1042                     |
| 234         | 2020-03-03T00:00:00.000Z | purchase   | 325        | 717                      |
| 234         | 2020-03-06T00:00:00.000Z | purchase   | 875        | -158                     |
| 234         | 2020-03-09T00:00:00.000Z | purchase   | 426        | -1285                    |
| 234         | 2020-03-09T00:00:00.000Z | purchase   | 701        | -1285                    |
| 234         | 2020-03-13T00:00:00.000Z | deposit    | 904        | -381                     |
| 234         | 2020-03-15T00:00:00.000Z | deposit    | 656        | 275                      |
| 234         | 2020-03-17T00:00:00.000Z | withdrawal | 745        | 1020                     |
| 234         | 2020-03-20T00:00:00.000Z | withdrawal | 494        | 1514                     |
| 234         | 2020-03-29T00:00:00.000Z | purchase   | 592        | 922                      |
| 235         | 2020-01-07T00:00:00.000Z | deposit    | 723        | 723                      |
| 235         | 2020-01-10T00:00:00.000Z | purchase   | 919        | -196                     |
| 235         | 2020-01-22T00:00:00.000Z | purchase   | 890        | -1086                    |
| 235         | 2020-01-31T00:00:00.000Z | purchase   | 877        | -1963                    |
| 235         | 2020-02-06T00:00:00.000Z | deposit    | 428        | -1535                    |
| 235         | 2020-02-22T00:00:00.000Z | deposit    | 535        | -1000                    |
| 235         | 2020-02-25T00:00:00.000Z | deposit    | 524        | -476                     |
| 235         | 2020-03-16T00:00:00.000Z | deposit    | 530        | 54                       |
| 235         | 2020-03-20T00:00:00.000Z | withdrawal | 30         | 84                       |
| 236         | 2020-01-27T00:00:00.000Z | deposit    | 356        | 356                      |
| 236         | 2020-02-05T00:00:00.000Z | deposit    | 335        | 691                      |
| 236         | 2020-02-18T00:00:00.000Z | deposit    | 538        | 1229                     |
| 236         | 2020-02-25T00:00:00.000Z | withdrawal | 170        | 1399                     |
| 236         | 2020-03-07T00:00:00.000Z | deposit    | 836        | 2235                     |
| 236         | 2020-03-14T00:00:00.000Z | deposit    | 347        | 2582                     |
| 236         | 2020-03-19T00:00:00.000Z | withdrawal | 771        | 3353                     |
| 236         | 2020-03-23T00:00:00.000Z | deposit    | 419        | 3772                     |
| 236         | 2020-03-25T00:00:00.000Z | withdrawal | 966        | 4738                     |
| 236         | 2020-04-01T00:00:00.000Z | purchase   | 501        | 4237                     |
| 236         | 2020-04-10T00:00:00.000Z | withdrawal | 73         | 4310                     |
| 236         | 2020-04-14T00:00:00.000Z | purchase   | 450        | 3860                     |
| 237         | 2020-01-16T00:00:00.000Z | deposit    | 106        | 106                      |
| 237         | 2020-01-21T00:00:00.000Z | withdrawal | 280        | 386                      |
| 237         | 2020-02-07T00:00:00.000Z | deposit    | 845        | 1231                     |
| 237         | 2020-02-09T00:00:00.000Z | withdrawal | 29         | 1260                     |
| 237         | 2020-02-15T00:00:00.000Z | withdrawal | 289        | 1766                     |
| 237         | 2020-02-15T00:00:00.000Z | withdrawal | 217        | 1766                     |
| 237         | 2020-03-16T00:00:00.000Z | deposit    | 679        | 2445                     |
| 237         | 2020-03-23T00:00:00.000Z | deposit    | 752        | 3197                     |
| 237         | 2020-04-01T00:00:00.000Z | withdrawal | 155        | 3352                     |
| 237         | 2020-04-02T00:00:00.000Z | deposit    | 9          | 3361                     |
| 237         | 2020-04-05T00:00:00.000Z | deposit    | 653        | 4014                     |
| 237         | 2020-04-08T00:00:00.000Z | purchase   | 480        | 3534                     |
| 237         | 2020-04-12T00:00:00.000Z | purchase   | 782        | 2752                     |
| 238         | 2020-01-18T00:00:00.000Z | deposit    | 896        | 802                      |
| 238         | 2020-01-18T00:00:00.000Z | purchase   | 94         | 802                      |
| 238         | 2020-02-09T00:00:00.000Z | deposit    | 585        | 1387                     |
| 238         | 2020-02-12T00:00:00.000Z | withdrawal | 278        | 1665                     |
| 238         | 2020-02-16T00:00:00.000Z | deposit    | 161        | 1826                     |
| 238         | 2020-04-10T00:00:00.000Z | withdrawal | 929        | 2755                     |
| 238         | 2020-04-12T00:00:00.000Z | purchase   | 820        | 1935                     |
| 239         | 2020-01-18T00:00:00.000Z | purchase   | 618        | 153                      |
| 239         | 2020-01-18T00:00:00.000Z | deposit    | 771        | 153                      |
| 239         | 2020-01-24T00:00:00.000Z | purchase   | 40         | 113                      |
| 239         | 2020-01-25T00:00:00.000Z | purchase   | 123        | -10                      |
| 239         | 2020-02-12T00:00:00.000Z | deposit    | 716        | 706                      |
| 239         | 2020-03-01T00:00:00.000Z | purchase   | 345        | 361                      |
| 239         | 2020-03-09T00:00:00.000Z | withdrawal | 113        | 474                      |
| 239         | 2020-03-12T00:00:00.000Z | deposit    | 506        | 980                      |
| 239         | 2020-03-21T00:00:00.000Z | deposit    | 586        | 1566                     |
| 239         | 2020-03-29T00:00:00.000Z | withdrawal | 718        | 2332                     |
| 239         | 2020-03-29T00:00:00.000Z | withdrawal | 48         | 2332                     |
| 239         | 2020-04-06T00:00:00.000Z | deposit    | 829        | 3161                     |
| 239         | 2020-04-08T00:00:00.000Z | deposit    | 468        | 3629                     |
| 240         | 2020-01-10T00:00:00.000Z | deposit    | 872        | 872                      |
| 240         | 2020-01-12T00:00:00.000Z | purchase   | 725        | 147                      |
| 240         | 2020-01-20T00:00:00.000Z | deposit    | 748        | 895                      |
| 240         | 2020-01-29T00:00:00.000Z | purchase   | 684        | 211                      |
| 240         | 2020-01-30T00:00:00.000Z | deposit    | 897        | 1108                     |
| 240         | 2020-02-01T00:00:00.000Z | purchase   | 313        | 789                      |
| 240         | 2020-02-01T00:00:00.000Z | purchase   | 6          | 789                      |
| 240         | 2020-02-07T00:00:00.000Z | purchase   | 35         | 754                      |
| 240         | 2020-03-01T00:00:00.000Z | deposit    | 864        | 1618                     |
| 240         | 2020-03-08T00:00:00.000Z | deposit    | 460        | 2931                     |
| 240         | 2020-03-08T00:00:00.000Z | deposit    | 853        | 2931                     |
| 240         | 2020-03-17T00:00:00.000Z | withdrawal | 494        | 3425                     |
| 240         | 2020-03-24T00:00:00.000Z | deposit    | 995        | 4420                     |
| 240         | 2020-03-25T00:00:00.000Z | withdrawal | 232        | 4652                     |
| 240         | 2020-04-01T00:00:00.000Z | withdrawal | 35         | 4687                     |
| 240         | 2020-04-03T00:00:00.000Z | purchase   | 258        | 4429                     |
| 240         | 2020-04-04T00:00:00.000Z | deposit    | 168        | 4597                     |
| 241         | 2020-01-01T00:00:00.000Z | deposit    | 161        | 161                      |
| 241         | 2020-01-05T00:00:00.000Z | purchase   | 141        | 20                       |
| 242         | 2020-01-20T00:00:00.000Z | deposit    | 256        | 256                      |
| 242         | 2020-01-22T00:00:00.000Z | purchase   | 227        | 29                       |
| 242         | 2020-01-27T00:00:00.000Z | deposit    | 441        | 470                      |
| 242         | 2020-01-28T00:00:00.000Z | deposit    | 673        | 1143                     |
| 242         | 2020-02-10T00:00:00.000Z | withdrawal | 835        | 1978                     |
| 242         | 2020-02-12T00:00:00.000Z | withdrawal | 228        | 2206                     |
| 242         | 2020-02-20T00:00:00.000Z | withdrawal | 328        | 2534                     |
| 242         | 2020-02-22T00:00:00.000Z | deposit    | 134        | 2668                     |
| 242         | 2020-02-26T00:00:00.000Z | withdrawal | 643        | 3311                     |
| 242         | 2020-02-28T00:00:00.000Z | deposit    | 295        | 3606                     |
| 242         | 2020-03-02T00:00:00.000Z | deposit    | 286        | 3892                     |
| 242         | 2020-03-09T00:00:00.000Z | purchase   | 225        | 3667                     |
| 242         | 2020-03-12T00:00:00.000Z | withdrawal | 654        | 4321                     |
| 242         | 2020-03-16T00:00:00.000Z | withdrawal | 713        | 5157                     |
| 242         | 2020-03-16T00:00:00.000Z | withdrawal | 123        | 5157                     |
| 242         | 2020-04-01T00:00:00.000Z | purchase   | 503        | 4654                     |
| 242         | 2020-04-05T00:00:00.000Z | withdrawal | 915        | 5941                     |
| 242         | 2020-04-05T00:00:00.000Z | withdrawal | 372        | 5941                     |
| 242         | 2020-04-09T00:00:00.000Z | deposit    | 1          | 5942                     |
| 242         | 2020-04-12T00:00:00.000Z | purchase   | 337        | 5605                     |
| 242         | 2020-04-14T00:00:00.000Z | withdrawal | 47         | 5652                     |
| 242         | 2020-04-18T00:00:00.000Z | deposit    | 730        | 6382                     |
| 243         | 2020-01-01T00:00:00.000Z | deposit    | 247        | 247                      |
| 243         | 2020-01-05T00:00:00.000Z | purchase   | 439        | -192                     |
| 243         | 2020-01-14T00:00:00.000Z | withdrawal | 176        | -16                      |
| 243         | 2020-03-13T00:00:00.000Z | deposit    | 964        | 948                      |
| 243         | 2020-03-21T00:00:00.000Z | deposit    | 351        | 1299                     |
| 243         | 2020-03-24T00:00:00.000Z | deposit    | 32         | 1331                     |
| 244         | 2020-01-27T00:00:00.000Z | deposit    | 728        | 728                      |
| 244         | 2020-02-05T00:00:00.000Z | purchase   | 220        | 508                      |
| 244         | 2020-02-13T00:00:00.000Z | deposit    | 448        | 956                      |
| 244         | 2020-02-18T00:00:00.000Z | deposit    | 796        | 1752                     |
| 244         | 2020-03-31T00:00:00.000Z | deposit    | 178        | 1930                     |
| 244         | 2020-04-10T00:00:00.000Z | purchase   | 284        | 1646                     |
| 244         | 2020-04-18T00:00:00.000Z | withdrawal | 769        | 2415                     |
| 245         | 2020-01-30T00:00:00.000Z | deposit    | 76         | 76                       |
| 245         | 2020-02-14T00:00:00.000Z | deposit    | 320        | 396                      |
| 245         | 2020-02-19T00:00:00.000Z | withdrawal | 737        | 1133                     |
| 245         | 2020-03-01T00:00:00.000Z | deposit    | 483        | 1534                     |
| 245         | 2020-03-01T00:00:00.000Z | purchase   | 82         | 1534                     |
| 245         | 2020-03-04T00:00:00.000Z | purchase   | 116        | 1418                     |
| 245         | 2020-03-08T00:00:00.000Z | deposit    | 345        | 1763                     |
| 245         | 2020-03-10T00:00:00.000Z | withdrawal | 45         | 1808                     |
| 245         | 2020-03-20T00:00:00.000Z | deposit    | 127        | 1935                     |
| 245         | 2020-03-22T00:00:00.000Z | withdrawal | 870        | 2805                     |
| 245         | 2020-03-23T00:00:00.000Z | purchase   | 434        | 2907                     |
| 245         | 2020-03-23T00:00:00.000Z | withdrawal | 536        | 2907                     |
| 245         | 2020-03-27T00:00:00.000Z | withdrawal | 322        | 3229                     |
| 245         | 2020-04-07T00:00:00.000Z | deposit    | 891        | 3500                     |
| 245         | 2020-04-07T00:00:00.000Z | purchase   | 620        | 3500                     |
| 245         | 2020-04-12T00:00:00.000Z | deposit    | 244        | 3744                     |
| 245         | 2020-04-16T00:00:00.000Z | deposit    | 266        | 4010                     |
| 245         | 2020-04-24T00:00:00.000Z | deposit    | 880        | 4890                     |
| 245         | 2020-04-28T00:00:00.000Z | withdrawal | 891        | 5781                     |
| 246         | 2020-01-29T00:00:00.000Z | deposit    | 506        | 506                      |
| 246         | 2020-02-10T00:00:00.000Z | deposit    | 609        | 1115                     |
| 246         | 2020-02-18T00:00:00.000Z | purchase   | 531        | 584                      |
| 246         | 2020-03-03T00:00:00.000Z | deposit    | 909        | 1493                     |
| 246         | 2020-03-05T00:00:00.000Z | withdrawal | 527        | 2020                     |
| 246         | 2020-03-25T00:00:00.000Z | withdrawal | 689        | 2709                     |
| 246         | 2020-04-03T00:00:00.000Z | purchase   | 859        | 1850                     |
| 246         | 2020-04-07T00:00:00.000Z | deposit    | 265        | 2115                     |
| 246         | 2020-04-08T00:00:00.000Z | purchase   | 860        | 1255                     |
| 246         | 2020-04-09T00:00:00.000Z | withdrawal | 955        | 2210                     |
| 247         | 2020-01-01T00:00:00.000Z | deposit    | 930        | 930                      |
| 247         | 2020-01-02T00:00:00.000Z | deposit    | 53         | 983                      |
| 247         | 2020-02-04T00:00:00.000Z | deposit    | 348        | 1331                     |
| 247         | 2020-02-15T00:00:00.000Z | purchase   | 754        | 577                      |
| 247         | 2020-03-11T00:00:00.000Z | purchase   | 317        | 260                      |
| 247         | 2020-03-13T00:00:00.000Z | deposit    | 132        | 392                      |
| 247         | 2020-03-28T00:00:00.000Z | withdrawal | 95         | 487                      |
| 248         | 2020-01-24T00:00:00.000Z | deposit    | 304        | 304                      |
| 248         | 2020-02-04T00:00:00.000Z | deposit    | 980        | 1284                     |
| 248         | 2020-02-10T00:00:00.000Z | withdrawal | 617        | 1901                     |
| 248         | 2020-03-04T00:00:00.000Z | purchase   | 938        | 963                      |
| 248         | 2020-03-13T00:00:00.000Z | deposit    | 654        | 1617                     |
| 248         | 2020-03-26T00:00:00.000Z | deposit    | 572        | 2189                     |
| 248         | 2020-04-05T00:00:00.000Z | deposit    | 844        | 3033                     |
| 248         | 2020-04-08T00:00:00.000Z | withdrawal | 620        | 3653                     |
| 248         | 2020-04-10T00:00:00.000Z | withdrawal | 166        | 3819                     |
| 248         | 2020-04-19T00:00:00.000Z | deposit    | 175        | 3994                     |
| 249         | 2020-01-14T00:00:00.000Z | deposit    | 336        | 336                      |
| 249         | 2020-03-02T00:00:00.000Z | deposit    | 729        | 1065                     |
| 249         | 2020-04-12T00:00:00.000Z | withdrawal | 170        | 1235                     |
| 250         | 2020-01-25T00:00:00.000Z | deposit    | 625        | 625                      |
| 250         | 2020-01-28T00:00:00.000Z | withdrawal | 476        | 1101                     |
| 250         | 2020-02-12T00:00:00.000Z | purchase   | 389        | 712                      |
| 250         | 2020-02-24T00:00:00.000Z | deposit    | 850        | 1562                     |
| 250         | 2020-02-27T00:00:00.000Z | purchase   | 610        | 952                      |
| 250         | 2020-03-04T00:00:00.000Z | purchase   | 643        | 356                      |
| 250         | 2020-03-04T00:00:00.000Z | withdrawal | 47         | 356                      |
| 250         | 2020-03-09T00:00:00.000Z | deposit    | 146        | 502                      |
| 250         | 2020-03-12T00:00:00.000Z | deposit    | 895        | 1397                     |
| 250         | 2020-03-26T00:00:00.000Z | deposit    | 493        | 1890                     |
| 250         | 2020-03-31T00:00:00.000Z | withdrawal | 667        | 2557                     |
| 250         | 2020-04-02T00:00:00.000Z | withdrawal | 195        | 2752                     |
| 250         | 2020-04-03T00:00:00.000Z | withdrawal | 903        | 3655                     |
| 250         | 2020-04-17T00:00:00.000Z | withdrawal | 634        | 4289                     |
| 251         | 2020-01-09T00:00:00.000Z | deposit    | 961        | 961                      |
| 251         | 2020-01-19T00:00:00.000Z | withdrawal | 413        | 1266                     |
| 251         | 2020-01-19T00:00:00.000Z | purchase   | 108        | 1266                     |
| 251         | 2020-01-21T00:00:00.000Z | deposit    | 836        | 2102                     |
| 251         | 2020-02-12T00:00:00.000Z | purchase   | 874        | 1228                     |
| 251         | 2020-02-17T00:00:00.000Z | purchase   | 783        | 445                      |
| 251         | 2020-02-27T00:00:00.000Z | deposit    | 200        | 645                      |
| 251         | 2020-02-28T00:00:00.000Z | withdrawal | 743        | 1388                     |
| 251         | 2020-03-03T00:00:00.000Z | withdrawal | 977        | 2365                     |
| 251         | 2020-03-07T00:00:00.000Z | deposit    | 703        | 3068                     |
| 251         | 2020-03-09T00:00:00.000Z | purchase   | 598        | 2470                     |
| 251         | 2020-03-11T00:00:00.000Z | deposit    | 323        | 3031                     |
| 251         | 2020-03-11T00:00:00.000Z | withdrawal | 238        | 3031                     |
| 251         | 2020-03-17T00:00:00.000Z | purchase   | 153        | 2878                     |
| 251         | 2020-03-25T00:00:00.000Z | deposit    | 595        | 3473                     |
| 251         | 2020-03-29T00:00:00.000Z | deposit    | 39         | 3512                     |
| 251         | 2020-04-01T00:00:00.000Z | withdrawal | 653        | 4165                     |
| 252         | 2020-01-26T00:00:00.000Z | deposit    | 982        | 982                      |
| 252         | 2020-01-28T00:00:00.000Z | purchase   | 693        | 289                      |
| 252         | 2020-04-24T00:00:00.000Z | withdrawal | 156        | 445                      |
| 253         | 2020-01-29T00:00:00.000Z | withdrawal | 971        | 1947                     |
| 253         | 2020-01-29T00:00:00.000Z | deposit    | 976        | 1947                     |
| 253         | 2020-01-30T00:00:00.000Z | withdrawal | 583        | 2530                     |
| 253         | 2020-02-07T00:00:00.000Z | purchase   | 724        | 1806                     |
| 253         | 2020-02-11T00:00:00.000Z | deposit    | 754        | 3023                     |
| 253         | 2020-02-11T00:00:00.000Z | deposit    | 463        | 3023                     |
| 253         | 2020-02-22T00:00:00.000Z | purchase   | 492        | 2531                     |
| 253         | 2020-03-17T00:00:00.000Z | purchase   | 723        | 1808                     |
| 253         | 2020-03-24T00:00:00.000Z | deposit    | 843        | 2651                     |
| 253         | 2020-04-04T00:00:00.000Z | withdrawal | 257        | 2908                     |
| 253         | 2020-04-06T00:00:00.000Z | withdrawal | 990        | 4137                     |
| 253         | 2020-04-06T00:00:00.000Z | deposit    | 239        | 4137                     |
| 253         | 2020-04-25T00:00:00.000Z | deposit    | 981        | 5118                     |
| 254         | 2020-01-05T00:00:00.000Z | deposit    | 856        | 856                      |
| 254         | 2020-01-27T00:00:00.000Z | purchase   | 820        | 36                       |
| 254         | 2020-02-02T00:00:00.000Z | purchase   | 482        | -446                     |
| 254         | 2020-02-08T00:00:00.000Z | withdrawal | 971        | 525                      |
| 254         | 2020-02-10T00:00:00.000Z | withdrawal | 314        | 839                      |
| 254         | 2020-02-23T00:00:00.000Z | purchase   | 931        | -92                      |
| 254         | 2020-02-27T00:00:00.000Z | purchase   | 221        | -313                     |
| 254         | 2020-03-14T00:00:00.000Z | withdrawal | 782        | 469                      |
| 254         | 2020-03-18T00:00:00.000Z | deposit    | 590        | 1059                     |
| 254         | 2020-03-27T00:00:00.000Z | deposit    | 961        | 2020                     |
| 254         | 2020-03-28T00:00:00.000Z | deposit    | 778        | 2798                     |
| 254         | 2020-03-29T00:00:00.000Z | deposit    | 17         | 2815                     |
| 254         | 2020-03-30T00:00:00.000Z | purchase   | 5          | 2810                     |
| 254         | 2020-03-31T00:00:00.000Z | deposit    | 734        | 3544                     |
| 255         | 2020-01-14T00:00:00.000Z | deposit    | 563        | 563                      |
| 255         | 2020-01-31T00:00:00.000Z | purchase   | 310        | 253                      |
| 255         | 2020-02-16T00:00:00.000Z | purchase   | 479        | -226                     |
| 255         | 2020-02-27T00:00:00.000Z | deposit    | 355        | 129                      |
| 255         | 2020-03-10T00:00:00.000Z | deposit    | 105        | 234                      |
| 255         | 2020-03-28T00:00:00.000Z | purchase   | 782        | -548                     |
| 256         | 2020-01-26T00:00:00.000Z | deposit    | 811        | 1743                     |
| 256         | 2020-01-26T00:00:00.000Z | deposit    | 932        | 1743                     |
| 256         | 2020-02-04T00:00:00.000Z | deposit    | 10         | 1753                     |
| 256         | 2020-02-15T00:00:00.000Z | withdrawal | 372        | 2125                     |
| 256         | 2020-02-20T00:00:00.000Z | withdrawal | 278        | 2403                     |
| 256         | 2020-02-24T00:00:00.000Z | purchase   | 72         | 2331                     |
| 256         | 2020-02-26T00:00:00.000Z | purchase   | 636        | 1695                     |
| 256         | 2020-02-27T00:00:00.000Z | deposit    | 962        | 2657                     |
| 256         | 2020-02-29T00:00:00.000Z | purchase   | 451        | 2206                     |
| 256         | 2020-03-02T00:00:00.000Z | deposit    | 469        | 2675                     |
| 256         | 2020-03-09T00:00:00.000Z | deposit    | 589        | 3264                     |
| 256         | 2020-03-10T00:00:00.000Z | purchase   | 354        | 2910                     |
| 256         | 2020-03-22T00:00:00.000Z | deposit    | 82         | 2992                     |
| 256         | 2020-03-23T00:00:00.000Z | withdrawal | 540        | 3532                     |
| 256         | 2020-04-04T00:00:00.000Z | purchase   | 191        | 3341                     |
| 256         | 2020-04-08T00:00:00.000Z | deposit    | 78         | 3419                     |
| 256         | 2020-04-10T00:00:00.000Z | withdrawal | 562        | 3981                     |
| 256         | 2020-04-17T00:00:00.000Z | purchase   | 327        | 3654                     |
| 256         | 2020-04-20T00:00:00.000Z | deposit    | 944        | 4598                     |
| 257         | 2020-01-20T00:00:00.000Z | deposit    | 493        | 493                      |
| 257         | 2020-01-27T00:00:00.000Z | withdrawal | 79         | 572                      |
| 257         | 2020-02-04T00:00:00.000Z | purchase   | 62         | 510                      |
| 257         | 2020-02-13T00:00:00.000Z | withdrawal | 319        | 829                      |
| 257         | 2020-02-17T00:00:00.000Z | deposit    | 13         | 842                      |
| 257         | 2020-02-19T00:00:00.000Z | purchase   | 929        | -87                      |
| 257         | 2020-02-22T00:00:00.000Z | deposit    | 501        | 414                      |
| 257         | 2020-02-24T00:00:00.000Z | purchase   | 546        | -132                     |
| 257         | 2020-02-28T00:00:00.000Z | withdrawal | 681        | 549                      |
| 257         | 2020-03-01T00:00:00.000Z | withdrawal | 659        | 1208                     |
| 257         | 2020-03-03T00:00:00.000Z | deposit    | 815        | 2023                     |
| 257         | 2020-03-07T00:00:00.000Z | withdrawal | 105        | 2128                     |
| 257         | 2020-03-16T00:00:00.000Z | purchase   | 53         | 2075                     |
| 257         | 2020-03-18T00:00:00.000Z | withdrawal | 31         | 2106                     |
| 257         | 2020-03-19T00:00:00.000Z | deposit    | 401        | 2507                     |
| 257         | 2020-03-20T00:00:00.000Z | deposit    | 769        | 3276                     |
| 257         | 2020-04-13T00:00:00.000Z | purchase   | 504        | 2772                     |
| 258         | 2020-01-25T00:00:00.000Z | deposit    | 590        | 590                      |
| 258         | 2020-02-04T00:00:00.000Z | purchase   | 849        | -259                     |
| 258         | 2020-02-14T00:00:00.000Z | purchase   | 817        | -1076                    |
| 258         | 2020-03-04T00:00:00.000Z | withdrawal | 379        | -697                     |
| 258         | 2020-03-06T00:00:00.000Z | purchase   | 782        | -1479                    |
| 258         | 2020-03-16T00:00:00.000Z | deposit    | 43         | -1436                    |
| 258         | 2020-03-25T00:00:00.000Z | deposit    | 115        | -1321                    |
| 258         | 2020-03-26T00:00:00.000Z | purchase   | 814        | -2135                    |
| 258         | 2020-04-03T00:00:00.000Z | deposit    | 819        | -1316                    |
| 258         | 2020-04-13T00:00:00.000Z | deposit    | 609        | -707                     |
| 259         | 2020-01-04T00:00:00.000Z | deposit    | 744        | 744                      |
| 259         | 2020-01-08T00:00:00.000Z | purchase   | 672        | 72                       |
| 259         | 2020-01-14T00:00:00.000Z | deposit    | 714        | 786                      |
| 259         | 2020-01-18T00:00:00.000Z | deposit    | 745        | 836                      |
| 259         | 2020-01-18T00:00:00.000Z | purchase   | 695        | 836                      |
| 259         | 2020-01-25T00:00:00.000Z | withdrawal | 352        | 1188                     |
| 259         | 2020-01-30T00:00:00.000Z | purchase   | 188        | 1000                     |
| 259         | 2020-01-31T00:00:00.000Z | deposit    | 632        | 1632                     |
| 259         | 2020-02-06T00:00:00.000Z | purchase   | 347        | 1285                     |
| 259         | 2020-02-17T00:00:00.000Z | withdrawal | 982        | 2267                     |
| 259         | 2020-02-18T00:00:00.000Z | withdrawal | 41         | 2308                     |
| 259         | 2020-02-22T00:00:00.000Z | withdrawal | 464        | 2772                     |
| 259         | 2020-02-23T00:00:00.000Z | deposit    | 639        | 3411                     |
| 259         | 2020-03-08T00:00:00.000Z | deposit    | 223        | 3634                     |
| 259         | 2020-03-17T00:00:00.000Z | withdrawal | 593        | 4227                     |
| 259         | 2020-03-30T00:00:00.000Z | withdrawal | 821        | 5048                     |
| 260         | 2020-01-26T00:00:00.000Z | deposit    | 899        | 899                      |
| 260         | 2020-01-28T00:00:00.000Z | deposit    | 966        | 1865                     |
| 260         | 2020-03-07T00:00:00.000Z | withdrawal | 952        | 2817                     |
| 260         | 2020-03-24T00:00:00.000Z | deposit    | 996        | 3813                     |
| 261         | 2020-01-25T00:00:00.000Z | deposit    | 746        | 746                      |
| 261         | 2020-02-04T00:00:00.000Z | deposit    | 974        | 1720                     |
| 261         | 2020-02-14T00:00:00.000Z | deposit    | 27         | 1747                     |
| 261         | 2020-02-20T00:00:00.000Z | withdrawal | 339        | 2086                     |
| 261         | 2020-03-02T00:00:00.000Z | purchase   | 778        | 1308                     |
| 261         | 2020-03-07T00:00:00.000Z | withdrawal | 959        | 2267                     |
| 261         | 2020-04-05T00:00:00.000Z | deposit    | 298        | 2565                     |
| 262         | 2020-01-04T00:00:00.000Z | deposit    | 83         | 811                      |
| 262         | 2020-01-04T00:00:00.000Z | withdrawal | 728        | 811                      |
| 262         | 2020-01-11T00:00:00.000Z | withdrawal | 368        | 1179                     |
| 262         | 2020-01-23T00:00:00.000Z | purchase   | 57         | 1122                     |
| 262         | 2020-02-15T00:00:00.000Z | purchase   | 702        | 420                      |
| 262         | 2020-02-16T00:00:00.000Z | purchase   | 227        | 193                      |
| 262         | 2020-02-17T00:00:00.000Z | purchase   | 16         | 177                      |
| 262         | 2020-02-18T00:00:00.000Z | withdrawal | 584        | 761                      |
| 262         | 2020-03-06T00:00:00.000Z | deposit    | 97         | 858                      |
| 262         | 2020-03-07T00:00:00.000Z | withdrawal | 516        | 1374                     |
| 262         | 2020-03-11T00:00:00.000Z | deposit    | 264        | 1638                     |
| 262         | 2020-03-19T00:00:00.000Z | deposit    | 646        | 2284                     |
| 262         | 2020-03-20T00:00:00.000Z | deposit    | 610        | 2894                     |
| 262         | 2020-03-23T00:00:00.000Z | purchase   | 871        | 2023                     |
| 262         | 2020-03-24T00:00:00.000Z | purchase   | 28         | 1995                     |
| 262         | 2020-03-25T00:00:00.000Z | deposit    | 155        | 2150                     |
| 262         | 2020-03-31T00:00:00.000Z | withdrawal | 130        | 2280                     |
| 263         | 2020-01-16T00:00:00.000Z | deposit    | 312        | 312                      |
| 263         | 2020-02-22T00:00:00.000Z | purchase   | 200        | 112                      |
| 263         | 2020-04-05T00:00:00.000Z | deposit    | 658        | 770                      |
| 264         | 2020-01-16T00:00:00.000Z | deposit    | 876        | 917                      |
| 264         | 2020-01-16T00:00:00.000Z | deposit    | 41         | 917                      |
| 264         | 2020-01-23T00:00:00.000Z | purchase   | 147        | 770                      |
| 264         | 2020-02-04T00:00:00.000Z | purchase   | 75         | 695                      |
| 264         | 2020-02-25T00:00:00.000Z | deposit    | 850        | 1545                     |
| 264         | 2020-03-10T00:00:00.000Z | deposit    | 886        | 2431                     |
| 264         | 2020-03-18T00:00:00.000Z | deposit    | 362        | 3780                     |
| 264         | 2020-03-18T00:00:00.000Z | deposit    | 987        | 3780                     |
| 264         | 2020-03-19T00:00:00.000Z | purchase   | 760        | 3020                     |
| 264         | 2020-03-25T00:00:00.000Z | purchase   | 932        | 2088                     |
| 264         | 2020-04-06T00:00:00.000Z | withdrawal | 793        | 2881                     |
| 265         | 2020-01-08T00:00:00.000Z | deposit    | 699        | 699                      |
| 265         | 2020-01-10T00:00:00.000Z | deposit    | 92         | 791                      |
| 265         | 2020-01-14T00:00:00.000Z | withdrawal | 818        | 1609                     |
| 265         | 2020-01-18T00:00:00.000Z | deposit    | 2          | 1611                     |
| 265         | 2020-02-05T00:00:00.000Z | purchase   | 161        | 1450                     |
| 265         | 2020-02-10T00:00:00.000Z | purchase   | 193        | 1257                     |
| 265         | 2020-02-14T00:00:00.000Z | purchase   | 577        | 680                      |
| 265         | 2020-02-17T00:00:00.000Z | purchase   | 73         | 607                      |
| 265         | 2020-02-28T00:00:00.000Z | withdrawal | 452        | 1059                     |
| 265         | 2020-03-03T00:00:00.000Z | deposit    | 280        | 1339                     |
| 265         | 2020-03-07T00:00:00.000Z | deposit    | 36         | 1375                     |
| 265         | 2020-03-08T00:00:00.000Z | deposit    | 483        | 1858                     |
| 265         | 2020-03-09T00:00:00.000Z | deposit    | 531        | 2389                     |
| 265         | 2020-03-16T00:00:00.000Z | purchase   | 257        | 2132                     |
| 265         | 2020-03-23T00:00:00.000Z | purchase   | 835        | 1297                     |
| 265         | 2020-03-26T00:00:00.000Z | withdrawal | 881        | 2178                     |
| 265         | 2020-03-27T00:00:00.000Z | deposit    | 89         | 2267                     |
| 265         | 2020-03-29T00:00:00.000Z | withdrawal | 557        | 2824                     |
| 265         | 2020-04-05T00:00:00.000Z | deposit    | 644        | 3468                     |
| 266         | 2020-01-17T00:00:00.000Z | deposit    | 651        | 651                      |
| 266         | 2020-02-05T00:00:00.000Z | deposit    | 804        | 1455                     |
| 266         | 2020-03-12T00:00:00.000Z | purchase   | 668        | 787                      |
| 266         | 2020-04-01T00:00:00.000Z | withdrawal | 507        | 1294                     |
| 266         | 2020-04-15T00:00:00.000Z | deposit    | 858        | 2152                     |
| 267         | 2020-01-19T00:00:00.000Z | deposit    | 31         | 31                       |
| 267         | 2020-01-29T00:00:00.000Z | purchase   | 196        | -165                     |
| 267         | 2020-01-30T00:00:00.000Z | withdrawal | 660        | 495                      |
| 267         | 2020-01-31T00:00:00.000Z | deposit    | 632        | 1127                     |
| 267         | 2020-02-11T00:00:00.000Z | withdrawal | 523        | 1650                     |
| 267         | 2020-02-20T00:00:00.000Z | purchase   | 497        | 1153                     |
| 267         | 2020-02-27T00:00:00.000Z | purchase   | 325        | 1358                     |
| 267         | 2020-02-27T00:00:00.000Z | withdrawal | 530        | 1358                     |
| 267         | 2020-03-06T00:00:00.000Z | deposit    | 201        | 1559                     |
| 267         | 2020-03-08T00:00:00.000Z | purchase   | 880        | 679                      |
| 267         | 2020-03-17T00:00:00.000Z | withdrawal | 970        | 1649                     |
| 267         | 2020-03-21T00:00:00.000Z | withdrawal | 501        | 2879                     |
| 267         | 2020-03-21T00:00:00.000Z | withdrawal | 729        | 2879                     |
| 267         | 2020-03-28T00:00:00.000Z | withdrawal | 289        | 3168                     |
| 267         | 2020-04-04T00:00:00.000Z | deposit    | 996        | 5081                     |
| 267         | 2020-04-04T00:00:00.000Z | deposit    | 917        | 5081                     |
| 267         | 2020-04-10T00:00:00.000Z | deposit    | 530        | 5611                     |
| 267         | 2020-04-13T00:00:00.000Z | deposit    | 351        | 5962                     |
| 268         | 2020-01-11T00:00:00.000Z | deposit    | 744        | 744                      |
| 268         | 2020-01-12T00:00:00.000Z | deposit    | 589        | 1333                     |
| 268         | 2020-01-15T00:00:00.000Z | deposit    | 291        | 1624                     |
| 268         | 2020-01-18T00:00:00.000Z | deposit    | 759        | 2383                     |
| 268         | 2020-01-21T00:00:00.000Z | deposit    | 249        | 2632                     |
| 268         | 2020-01-22T00:00:00.000Z | purchase   | 547        | 2085                     |
| 268         | 2020-01-31T00:00:00.000Z | withdrawal | 386        | 2471                     |
| 268         | 2020-02-01T00:00:00.000Z | withdrawal | 937        | 3408                     |
| 268         | 2020-02-04T00:00:00.000Z | purchase   | 169        | 3239                     |
| 268         | 2020-02-09T00:00:00.000Z | purchase   | 104        | 3135                     |
| 268         | 2020-02-13T00:00:00.000Z | deposit    | 503        | 3696                     |
| 268         | 2020-02-13T00:00:00.000Z | withdrawal | 58         | 3696                     |
| 268         | 2020-02-19T00:00:00.000Z | withdrawal | 811        | 4507                     |
| 268         | 2020-03-02T00:00:00.000Z | deposit    | 150        | 4657                     |
| 268         | 2020-03-08T00:00:00.000Z | purchase   | 52         | 4605                     |
| 268         | 2020-03-11T00:00:00.000Z | deposit    | 583        | 5188                     |
| 268         | 2020-03-14T00:00:00.000Z | purchase   | 84         | 5104                     |
| 268         | 2020-03-22T00:00:00.000Z | withdrawal | 450        | 5554                     |
| 268         | 2020-04-03T00:00:00.000Z | withdrawal | 488        | 6042                     |
| 269         | 2020-01-14T00:00:00.000Z | deposit    | 654        | 654                      |
| 269         | 2020-01-15T00:00:00.000Z | purchase   | 421        | 584                      |
| 269         | 2020-01-15T00:00:00.000Z | deposit    | 351        | 584                      |
| 269         | 2020-01-18T00:00:00.000Z | purchase   | 406        | 178                      |
| 269         | 2020-01-21T00:00:00.000Z | withdrawal | 895        | 1073                     |
| 269         | 2020-01-27T00:00:00.000Z | withdrawal | 705        | 1778                     |
| 269         | 2020-01-28T00:00:00.000Z | withdrawal | 765        | 2543                     |
| 269         | 2020-01-29T00:00:00.000Z | withdrawal | 478        | 3021                     |
| 269         | 2020-02-02T00:00:00.000Z | deposit    | 354        | 3375                     |
| 269         | 2020-02-11T00:00:00.000Z | purchase   | 550        | 2825                     |
| 269         | 2020-02-15T00:00:00.000Z | withdrawal | 459        | 3284                     |
| 269         | 2020-02-20T00:00:00.000Z | purchase   | 665        | 2619                     |
| 269         | 2020-03-04T00:00:00.000Z | withdrawal | 24         | 2643                     |
| 269         | 2020-03-10T00:00:00.000Z | deposit    | 471        | 3114                     |
| 269         | 2020-03-15T00:00:00.000Z | deposit    | 766        | 3880                     |
| 269         | 2020-03-30T00:00:00.000Z | deposit    | 302        | 4182                     |
| 269         | 2020-04-03T00:00:00.000Z | purchase   | 98         | 4084                     |
| 269         | 2020-04-07T00:00:00.000Z | deposit    | 640        | 4724                     |
| 269         | 2020-04-11T00:00:00.000Z | deposit    | 64         | 4788                     |
| 270         | 2020-01-16T00:00:00.000Z | deposit    | 294        | 294                      |
| 270         | 2020-01-18T00:00:00.000Z | deposit    | 708        | 1002                     |
| 270         | 2020-01-30T00:00:00.000Z | deposit    | 393        | 1395                     |
| 270         | 2020-02-02T00:00:00.000Z | withdrawal | 835        | 2230                     |
| 270         | 2020-02-18T00:00:00.000Z | deposit    | 520        | 2750                     |
| 270         | 2020-02-24T00:00:00.000Z | deposit    | 315        | 3065                     |
| 270         | 2020-02-26T00:00:00.000Z | deposit    | 69         | 3134                     |
| 270         | 2020-02-28T00:00:00.000Z | withdrawal | 503        | 3637                     |
| 270         | 2020-03-06T00:00:00.000Z | deposit    | 843        | 4480                     |
| 270         | 2020-03-11T00:00:00.000Z | withdrawal | 379        | 4859                     |
| 270         | 2020-03-15T00:00:00.000Z | withdrawal | 826        | 5685                     |
| 270         | 2020-04-06T00:00:00.000Z | purchase   | 984        | 4701                     |
| 270         | 2020-04-08T00:00:00.000Z | withdrawal | 57         | 4758                     |
| 271         | 2020-01-08T00:00:00.000Z | deposit    | 318        | 318                      |
| 271         | 2020-01-11T00:00:00.000Z | purchase   | 833        | -515                     |
| 271         | 2020-01-17T00:00:00.000Z | deposit    | 469        | -867                     |
| 271         | 2020-01-17T00:00:00.000Z | purchase   | 821        | -867                     |
| 271         | 2020-01-19T00:00:00.000Z | withdrawal | 719        | -148                     |
| 271         | 2020-02-02T00:00:00.000Z | deposit    | 965        | 817                      |
| 271         | 2020-02-06T00:00:00.000Z | purchase   | 167        | 650                      |
| 271         | 2020-02-26T00:00:00.000Z | deposit    | 737        | 1387                     |
| 271         | 2020-02-28T00:00:00.000Z | deposit    | 55         | 1442                     |
| 271         | 2020-02-29T00:00:00.000Z | deposit    | 268        | 1710                     |
| 271         | 2020-03-05T00:00:00.000Z | purchase   | 468        | 1826                     |
| 271         | 2020-03-05T00:00:00.000Z | withdrawal | 584        | 1826                     |
| 271         | 2020-03-11T00:00:00.000Z | purchase   | 842        | 739                      |
| 271         | 2020-03-11T00:00:00.000Z | purchase   | 245        | 739                      |
| 271         | 2020-03-18T00:00:00.000Z | deposit    | 844        | 1583                     |
| 271         | 2020-03-19T00:00:00.000Z | deposit    | 478        | 2061                     |
| 271         | 2020-03-23T00:00:00.000Z | deposit    | 497        | 2558                     |
| 271         | 2020-03-29T00:00:00.000Z | purchase   | 568        | 1990                     |
| 271         | 2020-04-02T00:00:00.000Z | deposit    | 857        | 2908                     |
| 271         | 2020-04-02T00:00:00.000Z | withdrawal | 61         | 2908                     |
| 272         | 2020-01-11T00:00:00.000Z | deposit    | 706        | 706                      |
| 272         | 2020-01-27T00:00:00.000Z | purchase   | 934        | -228                     |
| 272         | 2020-02-01T00:00:00.000Z | deposit    | 526        | 298                      |
| 272         | 2020-02-10T00:00:00.000Z | withdrawal | 563        | 861                      |
| 272         | 2020-02-19T00:00:00.000Z | purchase   | 852        | 9                        |
| 272         | 2020-02-22T00:00:00.000Z | withdrawal | 15         | 24                       |
| 272         | 2020-02-29T00:00:00.000Z | purchase   | 541        | -517                     |
| 272         | 2020-04-01T00:00:00.000Z | deposit    | 708        | 995                      |
| 272         | 2020-04-01T00:00:00.000Z | withdrawal | 804        | 995                      |
| 273         | 2020-01-19T00:00:00.000Z | deposit    | 876        | 876                      |
| 273         | 2020-02-08T00:00:00.000Z | deposit    | 751        | 1627                     |
| 273         | 2020-02-13T00:00:00.000Z | withdrawal | 883        | 2510                     |
| 273         | 2020-02-15T00:00:00.000Z | deposit    | 215        | 2725                     |
| 273         | 2020-02-22T00:00:00.000Z | withdrawal | 826        | 3551                     |
| 273         | 2020-03-23T00:00:00.000Z | deposit    | 684        | 4235                     |
| 273         | 2020-03-25T00:00:00.000Z | purchase   | 995        | 3240                     |
| 273         | 2020-04-06T00:00:00.000Z | deposit    | 859        | 4099                     |
| 273         | 2020-04-07T00:00:00.000Z | withdrawal | 147        | 4246                     |
| 273         | 2020-04-13T00:00:00.000Z | purchase   | 226        | 4020                     |
| 274         | 2020-01-02T00:00:00.000Z | deposit    | 801        | 801                      |
| 274         | 2020-01-03T00:00:00.000Z | purchase   | 174        | 1064                     |
| 274         | 2020-01-03T00:00:00.000Z | withdrawal | 437        | 1064                     |
| 274         | 2020-01-04T00:00:00.000Z | withdrawal | 839        | 1544                     |
| 274         | 2020-01-04T00:00:00.000Z | purchase   | 359        | 1544                     |
| 274         | 2020-01-07T00:00:00.000Z | deposit    | 763        | 2307                     |
| 274         | 2020-01-08T00:00:00.000Z | withdrawal | 217        | 2524                     |
| 274         | 2020-01-18T00:00:00.000Z | purchase   | 318        | 2206                     |
| 274         | 2020-02-09T00:00:00.000Z | purchase   | 949        | 1257                     |
| 274         | 2020-02-13T00:00:00.000Z | deposit    | 192        | 1449                     |
| 274         | 2020-02-15T00:00:00.000Z | deposit    | 815        | 2264                     |
| 274         | 2020-02-17T00:00:00.000Z | deposit    | 554        | 2818                     |
| 274         | 2020-02-23T00:00:00.000Z | withdrawal | 493        | 3311                     |
| 274         | 2020-02-28T00:00:00.000Z | deposit    | 79         | 3390                     |
| 274         | 2020-03-01T00:00:00.000Z | deposit    | 156        | 3546                     |
| 274         | 2020-03-09T00:00:00.000Z | deposit    | 895        | 4441                     |
| 274         | 2020-03-12T00:00:00.000Z | purchase   | 345        | 4096                     |
| 275         | 2020-01-28T00:00:00.000Z | deposit    | 211        | 211                      |
| 275         | 2020-02-10T00:00:00.000Z | purchase   | 390        | -179                     |
| 275         | 2020-02-16T00:00:00.000Z | withdrawal | 918        | 739                      |
| 275         | 2020-02-24T00:00:00.000Z | deposit    | 53         | 792                      |
| 275         | 2020-02-27T00:00:00.000Z | withdrawal | 281        | 1073                     |
| 275         | 2020-03-01T00:00:00.000Z | withdrawal | 481        | 1554                     |
| 275         | 2020-03-02T00:00:00.000Z | deposit    | 127        | 1681                     |
| 275         | 2020-03-05T00:00:00.000Z | deposit    | 377        | 2058                     |
| 275         | 2020-03-06T00:00:00.000Z | deposit    | 763        | 2821                     |
| 275         | 2020-03-14T00:00:00.000Z | deposit    | 600        | 3421                     |
| 275         | 2020-03-19T00:00:00.000Z | withdrawal | 869        | 4290                     |
| 275         | 2020-03-25T00:00:00.000Z | purchase   | 473        | 3817                     |
| 275         | 2020-03-28T00:00:00.000Z | purchase   | 768        | 3049                     |
| 275         | 2020-03-30T00:00:00.000Z | withdrawal | 924        | 3973                     |
| 275         | 2020-04-07T00:00:00.000Z | withdrawal | 643        | 4616                     |
| 275         | 2020-04-09T00:00:00.000Z | withdrawal | 220        | 4836                     |
| 275         | 2020-04-11T00:00:00.000Z | purchase   | 676        | 4160                     |
| 275         | 2020-04-13T00:00:00.000Z | deposit    | 934        | 5094                     |
| 275         | 2020-04-22T00:00:00.000Z | withdrawal | 445        | 5539                     |
| 275         | 2020-04-23T00:00:00.000Z | deposit    | 854        | 6393                     |
| 276         | 2020-01-07T00:00:00.000Z | deposit    | 926        | 926                      |
| 276         | 2020-01-09T00:00:00.000Z | withdrawal | 360        | 1286                     |
| 276         | 2020-01-10T00:00:00.000Z | purchase   | 52         | 1234                     |
| 276         | 2020-01-13T00:00:00.000Z | purchase   | 922        | -153                     |
| 276         | 2020-01-13T00:00:00.000Z | purchase   | 465        | -153                     |
| 276         | 2020-01-17T00:00:00.000Z | deposit    | 600        | 447                      |
| 276         | 2020-01-28T00:00:00.000Z | purchase   | 578        | -131                     |
| 276         | 2020-02-04T00:00:00.000Z | deposit    | 559        | 428                      |
| 276         | 2020-02-08T00:00:00.000Z | withdrawal | 222        | 650                      |
| 276         | 2020-02-21T00:00:00.000Z | deposit    | 319        | 969                      |
| 276         | 2020-02-25T00:00:00.000Z | withdrawal | 601        | 1570                     |
| 276         | 2020-03-01T00:00:00.000Z | deposit    | 189        | 774                      |
| 276         | 2020-03-01T00:00:00.000Z | purchase   | 985        | 774                      |
| 276         | 2020-03-08T00:00:00.000Z | deposit    | 624        | 1398                     |
| 276         | 2020-03-30T00:00:00.000Z | purchase   | 976        | 422                      |
| 277         | 2020-01-27T00:00:00.000Z | deposit    | 615        | 615                      |
| 277         | 2020-02-16T00:00:00.000Z | deposit    | 796        | 1411                     |
| 277         | 2020-03-09T00:00:00.000Z | purchase   | 143        | 1268                     |
| 277         | 2020-03-18T00:00:00.000Z | purchase   | 303        | 965                      |
| 277         | 2020-03-25T00:00:00.000Z | deposit    | 900        | 1865                     |
| 278         | 2020-01-26T00:00:00.000Z | deposit    | 682        | 682                      |
| 278         | 2020-01-27T00:00:00.000Z | deposit    | 627        | 1309                     |
| 278         | 2020-02-17T00:00:00.000Z | deposit    | 878        | 2187                     |
| 278         | 2020-02-21T00:00:00.000Z | purchase   | 10         | 2177                     |
| 278         | 2020-02-25T00:00:00.000Z | withdrawal | 618        | 2795                     |
| 278         | 2020-02-26T00:00:00.000Z | deposit    | 442        | 3237                     |
| 278         | 2020-02-28T00:00:00.000Z | withdrawal | 278        | 3515                     |
| 278         | 2020-03-03T00:00:00.000Z | withdrawal | 152        | 3667                     |
| 278         | 2020-03-11T00:00:00.000Z | deposit    | 455        | 4122                     |
| 278         | 2020-04-01T00:00:00.000Z | withdrawal | 276        | 4398                     |
| 278         | 2020-04-05T00:00:00.000Z | deposit    | 152        | 4550                     |
| 278         | 2020-04-11T00:00:00.000Z | deposit    | 396        | 4946                     |
| 278         | 2020-04-15T00:00:00.000Z | purchase   | 414        | 4532                     |
| 278         | 2020-04-16T00:00:00.000Z | deposit    | 417        | 4949                     |
| 278         | 2020-04-17T00:00:00.000Z | deposit    | 727        | 5676                     |
| 278         | 2020-04-20T00:00:00.000Z | deposit    | 526        | 6202                     |
| 279         | 2020-01-13T00:00:00.000Z | deposit    | 98         | 214                      |
| 279         | 2020-01-13T00:00:00.000Z | deposit    | 116        | 214                      |
| 279         | 2020-01-15T00:00:00.000Z | deposit    | 837        | 1051                     |
| 279         | 2020-01-23T00:00:00.000Z | deposit    | 844        | 1895                     |
| 279         | 2020-02-19T00:00:00.000Z | deposit    | 443        | 2338                     |
| 279         | 2020-02-24T00:00:00.000Z | deposit    | 725        | 3641                     |
| 279         | 2020-02-24T00:00:00.000Z | deposit    | 578        | 3641                     |
| 279         | 2020-03-25T00:00:00.000Z | purchase   | 83         | 3558                     |
| 279         | 2020-03-27T00:00:00.000Z | withdrawal | 135        | 3693                     |
| 279         | 2020-03-29T00:00:00.000Z | deposit    | 15         | 3708                     |
| 279         | 2020-03-30T00:00:00.000Z | deposit    | 745        | 4453                     |
| 279         | 2020-04-01T00:00:00.000Z | withdrawal | 80         | 4533                     |
| 280         | 2020-01-03T00:00:00.000Z | deposit    | 273        | 273                      |
| 280         | 2020-01-12T00:00:00.000Z | withdrawal | 834        | 1107                     |
| 280         | 2020-01-26T00:00:00.000Z | deposit    | 182        | 1289                     |
| 280         | 2020-01-29T00:00:00.000Z | deposit    | 292        | 1581                     |
| 280         | 2020-02-07T00:00:00.000Z | withdrawal | 16         | 1597                     |
| 280         | 2020-02-14T00:00:00.000Z | deposit    | 767        | 2364                     |
| 280         | 2020-02-15T00:00:00.000Z | withdrawal | 767        | 3131                     |
| 280         | 2020-02-24T00:00:00.000Z | purchase   | 82         | 3049                     |
| 280         | 2020-03-09T00:00:00.000Z | deposit    | 205        | 3254                     |
| 280         | 2020-03-10T00:00:00.000Z | withdrawal | 607        | 3861                     |
| 280         | 2020-03-27T00:00:00.000Z | deposit    | 214        | 4075                     |
| 281         | 2020-01-06T00:00:00.000Z | deposit    | 616        | 616                      |
| 281         | 2020-01-09T00:00:00.000Z | withdrawal | 147        | 763                      |
| 281         | 2020-01-11T00:00:00.000Z | deposit    | 357        | 1120                     |
| 281         | 2020-01-13T00:00:00.000Z | purchase   | 198        | 922                      |
| 281         | 2020-01-15T00:00:00.000Z | deposit    | 299        | 1221                     |
| 281         | 2020-01-18T00:00:00.000Z | purchase   | 229        | 992                      |
| 281         | 2020-01-21T00:00:00.000Z | withdrawal | 838        | 1830                     |
| 281         | 2020-01-29T00:00:00.000Z | deposit    | 360        | 2190                     |
| 281         | 2020-02-02T00:00:00.000Z | deposit    | 383        | 2573                     |
| 281         | 2020-02-08T00:00:00.000Z | withdrawal | 304        | 2877                     |
| 281         | 2020-02-11T00:00:00.000Z | deposit    | 875        | 3752                     |
| 281         | 2020-02-13T00:00:00.000Z | deposit    | 713        | 4465                     |
| 281         | 2020-02-27T00:00:00.000Z | purchase   | 832        | 3633                     |
| 281         | 2020-03-04T00:00:00.000Z | withdrawal | 102        | 3735                     |
| 281         | 2020-03-05T00:00:00.000Z | deposit    | 922        | 4657                     |
| 281         | 2020-03-06T00:00:00.000Z | deposit    | 701        | 5358                     |
| 281         | 2020-03-07T00:00:00.000Z | deposit    | 740        | 6098                     |
| 281         | 2020-03-08T00:00:00.000Z | purchase   | 210        | 5888                     |
| 281         | 2020-03-20T00:00:00.000Z | withdrawal | 929        | 6817                     |
| 281         | 2020-03-24T00:00:00.000Z | withdrawal | 865        | 7682                     |
| 281         | 2020-03-25T00:00:00.000Z | deposit    | 880        | 8562                     |
| 281         | 2020-04-04T00:00:00.000Z | deposit    | 812        | 9374                     |
| 282         | 2020-01-24T00:00:00.000Z | deposit    | 74         | 74                       |
| 282         | 2020-02-18T00:00:00.000Z | purchase   | 787        | -713                     |
| 282         | 2020-03-25T00:00:00.000Z | deposit    | 548        | -662                     |
| 282         | 2020-03-25T00:00:00.000Z | purchase   | 497        | -662                     |
| 282         | 2020-03-29T00:00:00.000Z | purchase   | 999        | -1661                    |
| 282         | 2020-04-02T00:00:00.000Z | deposit    | 370        | -1291                    |
| 282         | 2020-04-09T00:00:00.000Z | deposit    | 387        | -904                     |
| 282         | 2020-04-11T00:00:00.000Z | deposit    | 203        | -701                     |
| 282         | 2020-04-17T00:00:00.000Z | purchase   | 734        | -1435                    |
| 282         | 2020-04-20T00:00:00.000Z | deposit    | 124        | -1311                    |
| 283         | 2020-01-05T00:00:00.000Z | deposit    | 947        | 1924                     |
| 283         | 2020-01-05T00:00:00.000Z | withdrawal | 977        | 1924                     |
| 283         | 2020-01-06T00:00:00.000Z | withdrawal | 697        | 2621                     |
| 283         | 2020-01-11T00:00:00.000Z | deposit    | 49         | 2821                     |
| 283         | 2020-01-11T00:00:00.000Z | withdrawal | 151        | 2821                     |
| 283         | 2020-01-16T00:00:00.000Z | purchase   | 619        | 2202                     |
| 283         | 2020-01-21T00:00:00.000Z | deposit    | 50         | 2252                     |
| 283         | 2020-01-24T00:00:00.000Z | deposit    | 643        | 2895                     |
| 283         | 2020-01-31T00:00:00.000Z | withdrawal | 446        | 3341                     |
| 283         | 2020-02-05T00:00:00.000Z | deposit    | 58         | 3399                     |
| 283         | 2020-02-24T00:00:00.000Z | purchase   | 846        | 3382                     |
| 283         | 2020-02-24T00:00:00.000Z | withdrawal | 829        | 3382                     |
| 283         | 2020-03-05T00:00:00.000Z | purchase   | 606        | 2776                     |
| 283         | 2020-03-07T00:00:00.000Z | withdrawal | 662        | 3438                     |
| 283         | 2020-03-09T00:00:00.000Z | purchase   | 121        | 3317                     |
| 283         | 2020-03-27T00:00:00.000Z | purchase   | 231        | 3086                     |
| 283         | 2020-03-29T00:00:00.000Z | purchase   | 629        | 2457                     |
| 283         | 2020-03-31T00:00:00.000Z | purchase   | 654        | 1803                     |
| 283         | 2020-04-01T00:00:00.000Z | purchase   | 601        | 1202                     |
| 283         | 2020-04-02T00:00:00.000Z | purchase   | 823        | 379                      |
| 284         | 2020-01-30T00:00:00.000Z | deposit    | 257        | 257                      |
| 284         | 2020-02-02T00:00:00.000Z | withdrawal | 324        | 1443                     |
| 284         | 2020-02-02T00:00:00.000Z | deposit    | 862        | 1443                     |
| 284         | 2020-02-05T00:00:00.000Z | purchase   | 687        | 756                      |
| 284         | 2020-02-11T00:00:00.000Z | withdrawal | 574        | 284                      |
| 284         | 2020-02-11T00:00:00.000Z | purchase   | 836        | 284                      |
| 284         | 2020-02-11T00:00:00.000Z | purchase   | 210        | 284                      |
| 284         | 2020-02-14T00:00:00.000Z | purchase   | 586        | -302                     |
| 284         | 2020-02-18T00:00:00.000Z | withdrawal | 500        | 198                      |
| 284         | 2020-02-22T00:00:00.000Z | deposit    | 290        | 488                      |
| 284         | 2020-02-24T00:00:00.000Z | purchase   | 294        | 194                      |
| 284         | 2020-03-04T00:00:00.000Z | purchase   | 852        | -658                     |
| 284         | 2020-03-05T00:00:00.000Z | deposit    | 306        | -352                     |
| 284         | 2020-03-06T00:00:00.000Z | purchase   | 407        | -775                     |
| 284         | 2020-03-06T00:00:00.000Z | purchase   | 16         | -775                     |
| 284         | 2020-03-07T00:00:00.000Z | withdrawal | 646        | -129                     |
| 284         | 2020-03-10T00:00:00.000Z | deposit    | 679        | 550                      |
| 284         | 2020-03-27T00:00:00.000Z | deposit    | 712        | 1262                     |
| 284         | 2020-04-01T00:00:00.000Z | purchase   | 903        | 359                      |
| 284         | 2020-04-07T00:00:00.000Z | withdrawal | 741        | 1100                     |
| 284         | 2020-04-10T00:00:00.000Z | deposit    | 356        | 1456                     |
| 284         | 2020-04-23T00:00:00.000Z | deposit    | 735        | 2191                     |
| 285         | 2020-01-22T00:00:00.000Z | deposit    | 360        | 360                      |
| 285         | 2020-02-11T00:00:00.000Z | deposit    | 998        | 1358                     |
| 285         | 2020-03-08T00:00:00.000Z | deposit    | 607        | 1965                     |
| 286         | 2020-01-02T00:00:00.000Z | deposit    | 177        | 177                      |
| 286         | 2020-02-07T00:00:00.000Z | purchase   | 6          | 171                      |
| 287         | 2020-01-22T00:00:00.000Z | deposit    | 658        | 658                      |
| 287         | 2020-02-01T00:00:00.000Z | deposit    | 966        | 1624                     |
| 287         | 2020-02-05T00:00:00.000Z | purchase   | 227        | 1397                     |
| 287         | 2020-02-26T00:00:00.000Z | purchase   | 568        | 829                      |
| 287         | 2020-03-06T00:00:00.000Z | deposit    | 38         | 867                      |
| 287         | 2020-03-13T00:00:00.000Z | deposit    | 971        | 1838                     |
| 287         | 2020-03-14T00:00:00.000Z | deposit    | 518        | 2356                     |
| 287         | 2020-03-16T00:00:00.000Z | withdrawal | 932        | 3288                     |
| 287         | 2020-03-28T00:00:00.000Z | purchase   | 538        | 2750                     |
| 287         | 2020-04-09T00:00:00.000Z | purchase   | 816        | 1934                     |
| 287         | 2020-04-11T00:00:00.000Z | withdrawal | 476        | 2410                     |
| 288         | 2020-01-13T00:00:00.000Z | deposit    | 758        | 1344                     |
| 288         | 2020-01-13T00:00:00.000Z | deposit    | 586        | 1344                     |
| 288         | 2020-01-19T00:00:00.000Z | purchase   | 571        | 773                      |
| 288         | 2020-01-20T00:00:00.000Z | deposit    | 5          | 778                      |
| 288         | 2020-02-02T00:00:00.000Z | purchase   | 346        | 432                      |
| 288         | 2020-02-14T00:00:00.000Z | deposit    | 87         | 519                      |
| 288         | 2020-02-22T00:00:00.000Z | purchase   | 677        | -158                     |
| 288         | 2020-02-29T00:00:00.000Z | purchase   | 709        | -867                     |
| 288         | 2020-03-26T00:00:00.000Z | deposit    | 352        | -515                     |
| 289         | 2020-01-28T00:00:00.000Z | deposit    | 838        | 838                      |
| 289         | 2020-02-02T00:00:00.000Z | deposit    | 688        | 1526                     |
| 289         | 2020-02-11T00:00:00.000Z | withdrawal | 382        | 1908                     |
| 289         | 2020-02-14T00:00:00.000Z | purchase   | 939        | 969                      |
| 289         | 2020-02-24T00:00:00.000Z | purchase   | 412        | 557                      |
| 289         | 2020-03-03T00:00:00.000Z | purchase   | 64         | 493                      |
| 289         | 2020-03-07T00:00:00.000Z | deposit    | 860        | 1353                     |
| 289         | 2020-03-20T00:00:00.000Z | purchase   | 868        | 485                      |
| 289         | 2020-03-26T00:00:00.000Z | deposit    | 255        | 740                      |
| 289         | 2020-03-31T00:00:00.000Z | withdrawal | 910        | 1650                     |
| 289         | 2020-04-15T00:00:00.000Z | withdrawal | 453        | 2103                     |
| 289         | 2020-04-16T00:00:00.000Z | deposit    | 436        | 2539                     |
| 289         | 2020-04-24T00:00:00.000Z | withdrawal | 511        | 3050                     |
| 289         | 2020-04-26T00:00:00.000Z | deposit    | 403        | 3453                     |
| 290         | 2020-01-15T00:00:00.000Z | deposit    | 788        | 788                      |
| 290         | 2020-01-20T00:00:00.000Z | purchase   | 737        | 51                       |
| 290         | 2020-01-21T00:00:00.000Z | deposit    | 734        | 785                      |
| 290         | 2020-02-01T00:00:00.000Z | deposit    | 858        | 1643                     |
| 290         | 2020-02-09T00:00:00.000Z | withdrawal | 531        | 2174                     |
| 290         | 2020-02-12T00:00:00.000Z | purchase   | 174        | 2000                     |
| 290         | 2020-02-15T00:00:00.000Z | deposit    | 698        | 2698                     |
| 290         | 2020-02-20T00:00:00.000Z | withdrawal | 195        | 2893                     |
| 290         | 2020-02-26T00:00:00.000Z | withdrawal | 302        | 3195                     |
| 290         | 2020-03-20T00:00:00.000Z | deposit    | 922        | 4117                     |
| 290         | 2020-04-05T00:00:00.000Z | purchase   | 871        | 2663                     |
| 290         | 2020-04-05T00:00:00.000Z | purchase   | 583        | 2663                     |
| 290         | 2020-04-09T00:00:00.000Z | purchase   | 586        | 2077                     |
| 291         | 2020-01-20T00:00:00.000Z | deposit    | 930        | 930                      |
| 291         | 2020-04-01T00:00:00.000Z | deposit    | 8          | 938                      |
| 291         | 2020-04-10T00:00:00.000Z | purchase   | 697        | 241                      |
| 291         | 2020-04-14T00:00:00.000Z | deposit    | 290        | 531                      |
| 292         | 2020-01-10T00:00:00.000Z | deposit    | 136        | 136                      |
| 292         | 2020-01-13T00:00:00.000Z | withdrawal | 289        | 425                      |
| 292         | 2020-01-15T00:00:00.000Z | withdrawal | 909        | 1334                     |
| 292         | 2020-01-19T00:00:00.000Z | purchase   | 44         | 2263                     |
| 292         | 2020-01-19T00:00:00.000Z | withdrawal | 973        | 2263                     |
| 292         | 2020-01-26T00:00:00.000Z | purchase   | 760        | 1503                     |
| 292         | 2020-01-28T00:00:00.000Z | withdrawal | 218        | 1721                     |
| 292         | 2020-01-30T00:00:00.000Z | purchase   | 401        | 1320                     |
| 292         | 2020-02-13T00:00:00.000Z | withdrawal | 999        | 2319                     |
| 292         | 2020-02-23T00:00:00.000Z | purchase   | 46         | 2273                     |
| 292         | 2020-02-27T00:00:00.000Z | withdrawal | 143        | 2416                     |
| 292         | 2020-03-02T00:00:00.000Z | withdrawal | 270        | 2686                     |
| 292         | 2020-03-07T00:00:00.000Z | deposit    | 343        | 3029                     |
| 292         | 2020-03-14T00:00:00.000Z | deposit    | 503        | 3532                     |
| 292         | 2020-03-23T00:00:00.000Z | withdrawal | 690        | 4222                     |
| 293         | 2020-01-15T00:00:00.000Z | deposit    | 541        | 541                      |
| 293         | 2020-01-29T00:00:00.000Z | withdrawal | 27         | 568                      |
| 293         | 2020-01-30T00:00:00.000Z | purchase   | 993        | -425                     |
| 293         | 2020-01-31T00:00:00.000Z | deposit    | 96         | -329                     |
| 293         | 2020-02-04T00:00:00.000Z | deposit    | 48         | 685                      |
| 293         | 2020-02-04T00:00:00.000Z | withdrawal | 966        | 685                      |
| 293         | 2020-02-13T00:00:00.000Z | withdrawal | 464        | 1149                     |
| 293         | 2020-02-16T00:00:00.000Z | withdrawal | 804        | 1953                     |
| 293         | 2020-02-24T00:00:00.000Z | deposit    | 756        | 2709                     |
| 293         | 2020-02-29T00:00:00.000Z | deposit    | 361        | 3070                     |
| 293         | 2020-03-03T00:00:00.000Z | deposit    | 270        | 3340                     |
| 293         | 2020-03-28T00:00:00.000Z | withdrawal | 588        | 3928                     |
| 293         | 2020-04-09T00:00:00.000Z | purchase   | 730        | 3198                     |
| 294         | 2020-01-12T00:00:00.000Z | deposit    | 307        | 307                      |
| 294         | 2020-02-11T00:00:00.000Z | withdrawal | 79         | 386                      |
| 294         | 2020-02-14T00:00:00.000Z | withdrawal | 411        | 797                      |
| 294         | 2020-02-17T00:00:00.000Z | deposit    | 854        | 1651                     |
| 294         | 2020-02-18T00:00:00.000Z | deposit    | 886        | 2537                     |
| 294         | 2020-03-22T00:00:00.000Z | withdrawal | 850        | 3387                     |
| 295         | 2020-01-26T00:00:00.000Z | deposit    | 636        | 636                      |
| 295         | 2020-02-03T00:00:00.000Z | deposit    | 708        | 1344                     |
| 295         | 2020-02-15T00:00:00.000Z | purchase   | 848        | 496                      |
| 295         | 2020-03-06T00:00:00.000Z | deposit    | 987        | 1483                     |
| 295         | 2020-03-21T00:00:00.000Z | purchase   | 53         | 1430                     |
| 295         | 2020-04-03T00:00:00.000Z | purchase   | 475        | 955                      |
| 295         | 2020-04-15T00:00:00.000Z | purchase   | 474        | 481                      |
| 295         | 2020-04-18T00:00:00.000Z | purchase   | 658        | -177                     |
| 296         | 2020-01-13T00:00:00.000Z | deposit    | 846        | 846                      |
| 296         | 2020-01-27T00:00:00.000Z | withdrawal | 655        | 1501                     |
| 296         | 2020-02-01T00:00:00.000Z | deposit    | 983        | 2484                     |
| 296         | 2020-02-11T00:00:00.000Z | purchase   | 110        | 2374                     |
| 296         | 2020-02-17T00:00:00.000Z | withdrawal | 774        | 3148                     |
| 296         | 2020-02-22T00:00:00.000Z | deposit    | 733        | 3881                     |
| 296         | 2020-02-23T00:00:00.000Z | withdrawal | 212        | 4093                     |
| 296         | 2020-02-29T00:00:00.000Z | deposit    | 341        | 4434                     |
| 296         | 2020-03-11T00:00:00.000Z | deposit    | 317        | 4751                     |
| 296         | 2020-03-16T00:00:00.000Z | withdrawal | 160        | 4911                     |
| 296         | 2020-04-05T00:00:00.000Z | deposit    | 911        | 5822                     |
| 297         | 2020-01-25T00:00:00.000Z | deposit    | 469        | 469                      |
| 297         | 2020-01-26T00:00:00.000Z | deposit    | 973        | 1442                     |
| 297         | 2020-01-29T00:00:00.000Z | purchase   | 53         | 1389                     |
| 297         | 2020-01-30T00:00:00.000Z | deposit    | 47         | 2322                     |
| 297         | 2020-01-30T00:00:00.000Z | withdrawal | 886        | 2322                     |
| 297         | 2020-02-02T00:00:00.000Z | deposit    | 809        | 3131                     |
| 297         | 2020-02-17T00:00:00.000Z | withdrawal | 151        | 3282                     |
| 297         | 2020-02-18T00:00:00.000Z | withdrawal | 382        | 3664                     |
| 297         | 2020-02-20T00:00:00.000Z | purchase   | 741        | 2923                     |
| 297         | 2020-02-21T00:00:00.000Z | deposit    | 613        | 3536                     |
| 297         | 2020-02-28T00:00:00.000Z | withdrawal | 113        | 3649                     |
| 297         | 2020-03-07T00:00:00.000Z | deposit    | 822        | 4471                     |
| 297         | 2020-03-14T00:00:00.000Z | purchase   | 149        | 4322                     |
| 297         | 2020-03-20T00:00:00.000Z | purchase   | 391        | 3931                     |
| 297         | 2020-03-22T00:00:00.000Z | purchase   | 377        | 3554                     |
| 297         | 2020-03-30T00:00:00.000Z | deposit    | 514        | 4068                     |
| 297         | 2020-04-17T00:00:00.000Z | deposit    | 278        | 4346                     |
| 298         | 2020-01-16T00:00:00.000Z | deposit    | 36         | 36                       |
| 298         | 2020-01-21T00:00:00.000Z | withdrawal | 572        | 608                      |
| 298         | 2020-01-23T00:00:00.000Z | purchase   | 74         | 869                      |
| 298         | 2020-01-23T00:00:00.000Z | deposit    | 335        | 869                      |
| 298         | 2020-01-25T00:00:00.000Z | deposit    | 938        | 1807                     |
| 298         | 2020-01-26T00:00:00.000Z | purchase   | 385        | 1422                     |
| 298         | 2020-02-03T00:00:00.000Z | deposit    | 286        | 811                      |
| 298         | 2020-02-03T00:00:00.000Z | purchase   | 897        | 811                      |
| 298         | 2020-02-09T00:00:00.000Z | deposit    | 39         | 850                      |
| 298         | 2020-02-14T00:00:00.000Z | deposit    | 465        | 1315                     |
| 298         | 2020-02-23T00:00:00.000Z | withdrawal | 910        | 2632                     |
| 298         | 2020-02-23T00:00:00.000Z | deposit    | 407        | 2632                     |
| 298         | 2020-02-25T00:00:00.000Z | withdrawal | 669        | 3301                     |
| 298         | 2020-02-26T00:00:00.000Z | deposit    | 421        | 3722                     |
| 298         | 2020-03-01T00:00:00.000Z | deposit    | 425        | 4147                     |
| 298         | 2020-03-04T00:00:00.000Z | deposit    | 822        | 4969                     |
| 298         | 2020-03-08T00:00:00.000Z | purchase   | 10         | 4959                     |
| 298         | 2020-03-10T00:00:00.000Z | deposit    | 110        | 5069                     |
| 298         | 2020-04-10T00:00:00.000Z | deposit    | 722        | 5791                     |
| 299         | 2020-01-13T00:00:00.000Z | deposit    | 881        | 881                      |
| 299         | 2020-01-17T00:00:00.000Z | deposit    | 209        | 1090                     |
| 299         | 2020-01-21T00:00:00.000Z | withdrawal | 639        | 1729                     |
| 299         | 2020-01-22T00:00:00.000Z | deposit    | 319        | 2048                     |
| 299         | 2020-01-26T00:00:00.000Z | deposit    | 191        | 2239                     |
| 299         | 2020-02-06T00:00:00.000Z | deposit    | 654        | 2893                     |
| 299         | 2020-02-13T00:00:00.000Z | deposit    | 65         | 2958                     |
| 299         | 2020-02-15T00:00:00.000Z | deposit    | 447        | 3405                     |
| 299         | 2020-02-18T00:00:00.000Z | purchase   | 881        | 2524                     |
| 299         | 2020-03-02T00:00:00.000Z | withdrawal | 523        | 3047                     |
| 299         | 2020-03-14T00:00:00.000Z | purchase   | 891        | 2156                     |
| 299         | 2020-03-16T00:00:00.000Z | purchase   | 309        | 1847                     |
| 299         | 2020-03-18T00:00:00.000Z | deposit    | 678        | 1816                     |
| 299         | 2020-03-18T00:00:00.000Z | purchase   | 709        | 1816                     |
| 299         | 2020-03-21T00:00:00.000Z | deposit    | 578        | 2394                     |
| 300         | 2020-01-21T00:00:00.000Z | deposit    | 672        | 672                      |
| 300         | 2020-02-04T00:00:00.000Z | withdrawal | 372        | 1044                     |
| 300         | 2020-02-09T00:00:00.000Z | deposit    | 20         | 1064                     |
| 300         | 2020-02-12T00:00:00.000Z | withdrawal | 651        | 1715                     |
| 300         | 2020-02-13T00:00:00.000Z | purchase   | 78         | 1637                     |
| 300         | 2020-02-17T00:00:00.000Z | withdrawal | 540        | 2177                     |
| 300         | 2020-03-01T00:00:00.000Z | deposit    | 186        | 2363                     |
| 300         | 2020-03-02T00:00:00.000Z | purchase   | 916        | 1447                     |
| 300         | 2020-03-10T00:00:00.000Z | purchase   | 24         | 1423                     |
| 300         | 2020-03-11T00:00:00.000Z | withdrawal | 139        | 1562                     |
| 300         | 2020-03-13T00:00:00.000Z | deposit    | 87         | 1649                     |
| 300         | 2020-03-22T00:00:00.000Z | purchase   | 299        | 1350                     |
| 300         | 2020-03-25T00:00:00.000Z | deposit    | 389        | 1739                     |
| 300         | 2020-03-27T00:00:00.000Z | withdrawal | 811        | 3350                     |
| 300         | 2020-03-27T00:00:00.000Z | withdrawal | 800        | 3350                     |
| 300         | 2020-03-30T00:00:00.000Z | deposit    | 215        | 3565                     |
| 300         | 2020-03-31T00:00:00.000Z | deposit    | 687        | 4252                     |
| 300         | 2020-04-15T00:00:00.000Z | withdrawal | 75         | 4327                     |
| 300         | 2020-04-17T00:00:00.000Z | purchase   | 730        | 3597                     |
| 301         | 2020-01-20T00:00:00.000Z | deposit    | 32         | 32                       |
| 301         | 2020-01-21T00:00:00.000Z | deposit    | 613        | 645                      |
| 301         | 2020-01-24T00:00:00.000Z | withdrawal | 726        | 1371                     |
| 301         | 2020-01-29T00:00:00.000Z | purchase   | 825        | 546                      |
| 301         | 2020-02-06T00:00:00.000Z | purchase   | 990        | -444                     |
| 301         | 2020-02-11T00:00:00.000Z | withdrawal | 745        | 301                      |
| 301         | 2020-02-13T00:00:00.000Z | deposit    | 723        | 1024                     |
| 301         | 2020-02-18T00:00:00.000Z | deposit    | 634        | 1658                     |
| 301         | 2020-02-28T00:00:00.000Z | purchase   | 241        | 965                      |
| 301         | 2020-02-28T00:00:00.000Z | purchase   | 452        | 965                      |
| 301         | 2020-03-01T00:00:00.000Z | purchase   | 470        | 495                      |
| 301         | 2020-03-13T00:00:00.000Z | deposit    | 152        | 647                      |
| 301         | 2020-03-15T00:00:00.000Z | deposit    | 67         | 714                      |
| 301         | 2020-03-16T00:00:00.000Z | purchase   | 26         | 688                      |
| 301         | 2020-03-17T00:00:00.000Z | deposit    | 868        | 1556                     |
| 301         | 2020-03-18T00:00:00.000Z | withdrawal | 561        | 1964                     |
| 301         | 2020-03-18T00:00:00.000Z | purchase   | 153        | 1964                     |
| 301         | 2020-03-21T00:00:00.000Z | purchase   | 950        | 1014                     |
| 301         | 2020-03-23T00:00:00.000Z | deposit    | 14         | 1028                     |
| 301         | 2020-03-27T00:00:00.000Z | purchase   | 181        | 847                      |
| 301         | 2020-03-28T00:00:00.000Z | purchase   | 419        | 428                      |
| 301         | 2020-04-18T00:00:00.000Z | deposit    | 107        | 535                      |
| 302         | 2020-01-27T00:00:00.000Z | withdrawal | 862        | 624                      |
| 302         | 2020-01-27T00:00:00.000Z | deposit    | 143        | 624                      |
| 302         | 2020-01-27T00:00:00.000Z | purchase   | 381        | 624                      |
| 302         | 2020-01-29T00:00:00.000Z | purchase   | 399        | 225                      |
| 302         | 2020-02-03T00:00:00.000Z | withdrawal | 838        | 1063                     |
| 302         | 2020-02-14T00:00:00.000Z | purchase   | 268        | 795                      |
| 302         | 2020-02-25T00:00:00.000Z | deposit    | 528        | 1323                     |
| 302         | 2020-03-01T00:00:00.000Z | withdrawal | 860        | 2183                     |
| 302         | 2020-03-07T00:00:00.000Z | deposit    | 652        | 2835                     |
| 302         | 2020-03-09T00:00:00.000Z | purchase   | 465        | 2370                     |
| 302         | 2020-03-30T00:00:00.000Z | deposit    | 340        | 2710                     |
| 302         | 2020-04-20T00:00:00.000Z | deposit    | 615        | 3325                     |
| 303         | 2020-01-18T00:00:00.000Z | deposit    | 433        | 433                      |
| 303         | 2020-01-31T00:00:00.000Z | withdrawal | 101        | 534                      |
| 303         | 2020-02-01T00:00:00.000Z | deposit    | 515        | 1049                     |
| 303         | 2020-02-04T00:00:00.000Z | deposit    | 474        | 1523                     |
| 303         | 2020-02-19T00:00:00.000Z | purchase   | 367        | 1156                     |
| 303         | 2020-02-27T00:00:00.000Z | purchase   | 489        | 667                      |
| 303         | 2020-03-03T00:00:00.000Z | deposit    | 473        | 1140                     |
| 303         | 2020-03-07T00:00:00.000Z | purchase   | 878        | 262                      |
| 303         | 2020-03-14T00:00:00.000Z | deposit    | 557        | 819                      |
| 303         | 2020-03-16T00:00:00.000Z | withdrawal | 565        | 1384                     |
| 303         | 2020-03-18T00:00:00.000Z | purchase   | 260        | 1124                     |
| 303         | 2020-03-19T00:00:00.000Z | purchase   | 421        | 703                      |
| 303         | 2020-04-02T00:00:00.000Z | purchase   | 904        | -201                     |
| 303         | 2020-04-08T00:00:00.000Z | deposit    | 89         | -112                     |
| 303         | 2020-04-10T00:00:00.000Z | deposit    | 784        | 672                      |
| 304         | 2020-01-16T00:00:00.000Z | deposit    | 848        | 152                      |
| 304         | 2020-01-16T00:00:00.000Z | purchase   | 696        | 152                      |
| 304         | 2020-02-12T00:00:00.000Z | withdrawal | 94         | 246                      |
| 304         | 2020-02-15T00:00:00.000Z | deposit    | 232        | 478                      |
| 304         | 2020-02-18T00:00:00.000Z | withdrawal | 594        | 1072                     |
| 304         | 2020-02-23T00:00:00.000Z | withdrawal | 860        | 1932                     |
| 304         | 2020-02-26T00:00:00.000Z | purchase   | 196        | 1736                     |
| 304         | 2020-03-02T00:00:00.000Z | withdrawal | 11         | 1747                     |
| 304         | 2020-03-05T00:00:00.000Z | purchase   | 738        | 1009                     |
| 304         | 2020-03-08T00:00:00.000Z | purchase   | 8          | 1001                     |
| 304         | 2020-03-13T00:00:00.000Z | withdrawal | 13         | 1014                     |
| 304         | 2020-03-16T00:00:00.000Z | withdrawal | 879        | 1893                     |
| 304         | 2020-03-23T00:00:00.000Z | deposit    | 950        | 2843                     |
| 304         | 2020-03-24T00:00:00.000Z | withdrawal | 361        | 3204                     |
| 304         | 2020-04-06T00:00:00.000Z | withdrawal | 381        | 3585                     |
| 304         | 2020-04-07T00:00:00.000Z | deposit    | 533        | 4118                     |
| 304         | 2020-04-13T00:00:00.000Z | deposit    | 221        | 4339                     |
| 305         | 2020-01-09T00:00:00.000Z | deposit    | 36         | 36                       |
| 305         | 2020-01-11T00:00:00.000Z | withdrawal | 2          | 38                       |
| 305         | 2020-01-16T00:00:00.000Z | deposit    | 366        | 404                      |
| 305         | 2020-01-17T00:00:00.000Z | withdrawal | 380        | 784                      |
| 305         | 2020-02-04T00:00:00.000Z | deposit    | 517        | 1301                     |
| 305         | 2020-02-16T00:00:00.000Z | purchase   | 348        | 953                      |
| 305         | 2020-03-07T00:00:00.000Z | deposit    | 773        | 2131                     |
| 305         | 2020-03-07T00:00:00.000Z | withdrawal | 405        | 2131                     |
| 305         | 2020-03-22T00:00:00.000Z | withdrawal | 613        | 2744                     |
| 306         | 2020-01-27T00:00:00.000Z | deposit    | 402        | 402                      |
| 306         | 2020-03-08T00:00:00.000Z | deposit    | 630        | 1032                     |
| 306         | 2020-03-15T00:00:00.000Z | purchase   | 874        | 158                      |
| 306         | 2020-03-18T00:00:00.000Z | withdrawal | 968        | 1126                     |
| 306         | 2020-03-28T00:00:00.000Z | deposit    | 810        | 1936                     |
| 306         | 2020-04-05T00:00:00.000Z | withdrawal | 847        | 2783                     |
| 306         | 2020-04-07T00:00:00.000Z | withdrawal | 432        | 3998                     |
| 306         | 2020-04-07T00:00:00.000Z | deposit    | 783        | 3998                     |
| 306         | 2020-04-12T00:00:00.000Z | deposit    | 805        | 5206                     |
| 306         | 2020-04-12T00:00:00.000Z | deposit    | 403        | 5206                     |
| 306         | 2020-04-15T00:00:00.000Z | deposit    | 217        | 5423                     |
| 306         | 2020-04-16T00:00:00.000Z | deposit    | 582        | 6005                     |
| 306         | 2020-04-18T00:00:00.000Z | purchase   | 362        | 5911                     |
| 306         | 2020-04-18T00:00:00.000Z | deposit    | 268        | 5911                     |
| 306         | 2020-04-19T00:00:00.000Z | deposit    | 370        | 7207                     |
| 306         | 2020-04-19T00:00:00.000Z | withdrawal | 926        | 7207                     |
| 306         | 2020-04-25T00:00:00.000Z | deposit    | 704        | 7911                     |
| 307         | 2020-01-14T00:00:00.000Z | deposit    | 363        | 363                      |
| 307         | 2020-01-19T00:00:00.000Z | purchase   | 99         | 264                      |
| 307         | 2020-01-24T00:00:00.000Z | purchase   | 652        | -388                     |
| 307         | 2020-01-26T00:00:00.000Z | purchase   | 308        | -696                     |
| 307         | 2020-02-18T00:00:00.000Z | deposit    | 970        | 274                      |
| 307         | 2020-02-19T00:00:00.000Z | deposit    | 817        | 1091                     |
| 307         | 2020-02-20T00:00:00.000Z | withdrawal | 341        | 1432                     |
| 307         | 2020-03-17T00:00:00.000Z | deposit    | 212        | 1644                     |
| 307         | 2020-03-23T00:00:00.000Z | withdrawal | 867        | 2511                     |
| 307         | 2020-03-27T00:00:00.000Z | deposit    | 430        | 2941                     |
| 307         | 2020-04-09T00:00:00.000Z | withdrawal | 463        | 3404                     |
| 308         | 2020-01-14T00:00:00.000Z | deposit    | 782        | 782                      |
| 308         | 2020-01-21T00:00:00.000Z | purchase   | 962        | -180                     |
| 308         | 2020-01-27T00:00:00.000Z | withdrawal | 381        | 201                      |
| 308         | 2020-02-29T00:00:00.000Z | deposit    | 877        | 1078                     |
| 308         | 2020-03-04T00:00:00.000Z | purchase   | 249        | 829                      |
| 308         | 2020-03-24T00:00:00.000Z | deposit    | 389        | 1218                     |
| 308         | 2020-03-25T00:00:00.000Z | deposit    | 183        | 1401                     |
| 308         | 2020-03-26T00:00:00.000Z | purchase   | 656        | 745                      |
| 308         | 2020-03-27T00:00:00.000Z | deposit    | 727        | 1472                     |
| 308         | 2020-04-01T00:00:00.000Z | deposit    | 619        | 1733                     |
| 308         | 2020-04-01T00:00:00.000Z | purchase   | 358        | 1733                     |
| 309         | 2020-01-13T00:00:00.000Z | purchase   | 532        | 463                      |
| 309         | 2020-01-13T00:00:00.000Z | deposit    | 995        | 463                      |
| 309         | 2020-01-25T00:00:00.000Z | purchase   | 518        | -55                      |
| 309         | 2020-01-27T00:00:00.000Z | withdrawal | 308        | 253                      |
| 309         | 2020-02-02T00:00:00.000Z | purchase   | 898        | -645                     |
| 309         | 2020-02-08T00:00:00.000Z | purchase   | 341        | -986                     |
| 309         | 2020-02-09T00:00:00.000Z | deposit    | 822        | -164                     |
| 309         | 2020-02-15T00:00:00.000Z | purchase   | 69         | -233                     |
| 309         | 2020-02-17T00:00:00.000Z | purchase   | 812        | -1045                    |
| 309         | 2020-02-19T00:00:00.000Z | deposit    | 96         | -949                     |
| 309         | 2020-02-22T00:00:00.000Z | withdrawal | 839        | -110                     |
| 309         | 2020-03-18T00:00:00.000Z | deposit    | 577        | 467                      |
| 309         | 2020-03-20T00:00:00.000Z | deposit    | 663        | 1130                     |
| 309         | 2020-03-25T00:00:00.000Z | purchase   | 649        | 481                      |
| 309         | 2020-04-04T00:00:00.000Z | purchase   | 151        | 330                      |
| 309         | 2020-04-05T00:00:00.000Z | withdrawal | 37         | 367                      |
| 309         | 2020-04-09T00:00:00.000Z | deposit    | 301        | 1408                     |
| 309         | 2020-04-09T00:00:00.000Z | deposit    | 740        | 1408                     |
| 310         | 2020-01-20T00:00:00.000Z | deposit    | 331        | 331                      |
| 310         | 2020-01-31T00:00:00.000Z | deposit    | 529        | 860                      |
| 310         | 2020-02-01T00:00:00.000Z | withdrawal | 432        | 1292                     |
| 310         | 2020-02-15T00:00:00.000Z | withdrawal | 272        | 1564                     |
| 310         | 2020-03-02T00:00:00.000Z | deposit    | 850        | 2414                     |
| 310         | 2020-03-20T00:00:00.000Z | deposit    | 560        | 2974                     |
| 310         | 2020-03-25T00:00:00.000Z | deposit    | 770        | 3744                     |
| 310         | 2020-03-29T00:00:00.000Z | deposit    | 730        | 4474                     |
| 311         | 2020-01-17T00:00:00.000Z | deposit    | 918        | 918                      |
| 311         | 2020-01-25T00:00:00.000Z | purchase   | 994        | -76                      |
| 311         | 2020-01-28T00:00:00.000Z | deposit    | 386        | 310                      |
| 311         | 2020-02-09T00:00:00.000Z | withdrawal | 607        | 917                      |
| 311         | 2020-02-11T00:00:00.000Z | deposit    | 476        | 1393                     |
| 311         | 2020-02-21T00:00:00.000Z | deposit    | 827        | 2220                     |
| 311         | 2020-03-08T00:00:00.000Z | withdrawal | 832        | 3052                     |
| 311         | 2020-03-12T00:00:00.000Z | withdrawal | 853        | 3905                     |
| 311         | 2020-03-15T00:00:00.000Z | purchase   | 276        | 3629                     |
| 311         | 2020-04-02T00:00:00.000Z | deposit    | 207        | 3836                     |
| 311         | 2020-04-15T00:00:00.000Z | purchase   | 307        | 3529                     |
| 312         | 2020-01-20T00:00:00.000Z | deposit    | 485        | 485                      |
| 312         | 2020-02-05T00:00:00.000Z | purchase   | 942        | -457                     |
| 312         | 2020-02-25T00:00:00.000Z | deposit    | 470        | 13                       |
| 312         | 2020-02-26T00:00:00.000Z | deposit    | 643        | 656                      |
| 312         | 2020-03-13T00:00:00.000Z | purchase   | 794        | -138                     |
| 312         | 2020-03-15T00:00:00.000Z | withdrawal | 994        | 856                      |
| 312         | 2020-03-28T00:00:00.000Z | deposit    | 67         | 923                      |
| 312         | 2020-04-01T00:00:00.000Z | withdrawal | 602        | 1525                     |
| 312         | 2020-04-15T00:00:00.000Z | withdrawal | 651        | 2176                     |
| 313         | 2020-01-29T00:00:00.000Z | deposit    | 710        | 710                      |
| 313         | 2020-01-30T00:00:00.000Z | deposit    | 191        | 901                      |
| 313         | 2020-02-02T00:00:00.000Z | purchase   | 85         | 816                      |
| 313         | 2020-02-05T00:00:00.000Z | purchase   | 69         | 747                      |
| 313         | 2020-02-08T00:00:00.000Z | purchase   | 53         | 694                      |
| 313         | 2020-02-11T00:00:00.000Z | deposit    | 388        | 1082                     |
| 313         | 2020-02-19T00:00:00.000Z | withdrawal | 110        | 1192                     |
| 313         | 2020-03-02T00:00:00.000Z | withdrawal | 440        | 1632                     |
| 313         | 2020-03-08T00:00:00.000Z | purchase   | 344        | 1288                     |
| 313         | 2020-03-09T00:00:00.000Z | purchase   | 860        | 428                      |
| 313         | 2020-03-30T00:00:00.000Z | purchase   | 639        | -211                     |
| 313         | 2020-04-01T00:00:00.000Z | deposit    | 634        | 423                      |
| 313         | 2020-04-13T00:00:00.000Z | deposit    | 840        | 1263                     |
| 313         | 2020-04-27T00:00:00.000Z | purchase   | 197        | 1066                     |
| 314         | 2020-01-26T00:00:00.000Z | deposit    | 448        | 448                      |
| 314         | 2020-02-14T00:00:00.000Z | purchase   | 339        | 109                      |
| 314         | 2020-02-15T00:00:00.000Z | purchase   | 714        | -605                     |
| 314         | 2020-02-27T00:00:00.000Z | purchase   | 28         | -633                     |
| 314         | 2020-03-05T00:00:00.000Z | deposit    | 232        | -401                     |
| 314         | 2020-03-20T00:00:00.000Z | deposit    | 492        | 91                       |
| 314         | 2020-04-05T00:00:00.000Z | withdrawal | 60         | 151                      |
| 314         | 2020-04-06T00:00:00.000Z | deposit    | 463        | -129                     |
| 314         | 2020-04-06T00:00:00.000Z | purchase   | 743        | -129                     |
| 315         | 2020-01-22T00:00:00.000Z | deposit    | 911        | 1295                     |
| 315         | 2020-01-22T00:00:00.000Z | deposit    | 384        | 1295                     |
| 315         | 2020-02-08T00:00:00.000Z | deposit    | 54         | 1349                     |
| 315         | 2020-03-26T00:00:00.000Z | deposit    | 938        | 2287                     |
| 316         | 2020-01-23T00:00:00.000Z | deposit    | 184        | 184                      |
| 316         | 2020-02-06T00:00:00.000Z | purchase   | 663        | -479                     |
| 316         | 2020-02-17T00:00:00.000Z | purchase   | 851        | -1330                    |
| 316         | 2020-02-25T00:00:00.000Z | purchase   | 305        | -1635                    |
| 316         | 2020-02-27T00:00:00.000Z | purchase   | 848        | -2483                    |
| 316         | 2020-03-09T00:00:00.000Z | deposit    | 264        | -2219                    |
| 316         | 2020-03-12T00:00:00.000Z | purchase   | 208        | -2427                    |
| 316         | 2020-03-31T00:00:00.000Z | purchase   | 872        | -3299                    |
| 317         | 2020-01-11T00:00:00.000Z | deposit    | 869        | 869                      |
| 317         | 2020-02-26T00:00:00.000Z | deposit    | 363        | 1232                     |
| 317         | 2020-04-09T00:00:00.000Z | withdrawal | 237        | 1469                     |
| 318         | 2020-01-06T00:00:00.000Z | deposit    | 720        | 720                      |
| 318         | 2020-01-27T00:00:00.000Z | withdrawal | 399        | 1119                     |
| 318         | 2020-02-21T00:00:00.000Z | withdrawal | 663        | 1782                     |
| 318         | 2020-03-12T00:00:00.000Z | withdrawal | 993        | 2775                     |
| 318         | 2020-03-16T00:00:00.000Z | purchase   | 313        | 2462                     |
| 319         | 2020-01-06T00:00:00.000Z | deposit    | 83         | 83                       |
| 319         | 2020-02-20T00:00:00.000Z | withdrawal | 786        | 869                      |
| 319         | 2020-03-03T00:00:00.000Z | purchase   | 381        | 488                      |
| 319         | 2020-03-06T00:00:00.000Z | deposit    | 821        | 1309                     |
| 319         | 2020-03-22T00:00:00.000Z | purchase   | 169        | 1140                     |
| 319         | 2020-03-27T00:00:00.000Z | purchase   | 56         | 1084                     |
| 320         | 2020-01-10T00:00:00.000Z | deposit    | 725        | 725                      |
| 320         | 2020-01-11T00:00:00.000Z | deposit    | 2          | 727                      |
| 320         | 2020-01-19T00:00:00.000Z | deposit    | 917        | 1644                     |
| 320         | 2020-01-24T00:00:00.000Z | deposit    | 782        | 2426                     |
| 320         | 2020-02-07T00:00:00.000Z | deposit    | 898        | 3324                     |
| 320         | 2020-02-10T00:00:00.000Z | deposit    | 224        | 3548                     |
| 320         | 2020-02-23T00:00:00.000Z | purchase   | 440        | 2892                     |
| 320         | 2020-02-23T00:00:00.000Z | purchase   | 216        | 2892                     |
| 320         | 2020-02-24T00:00:00.000Z | purchase   | 575        | 2317                     |
| 320         | 2020-02-25T00:00:00.000Z | withdrawal | 408        | 2725                     |
| 320         | 2020-03-08T00:00:00.000Z | deposit    | 538        | 3263                     |
| 320         | 2020-03-27T00:00:00.000Z | purchase   | 208        | 3055                     |
| 320         | 2020-04-03T00:00:00.000Z | deposit    | 267        | 3322                     |
| 320         | 2020-04-07T00:00:00.000Z | deposit    | 345        | 3667                     |
| 321         | 2020-01-24T00:00:00.000Z | deposit    | 243        | 243                      |
| 321         | 2020-02-17T00:00:00.000Z | purchase   | 403        | -160                     |
| 321         | 2020-02-21T00:00:00.000Z | deposit    | 193        | 33                       |
| 321         | 2020-02-28T00:00:00.000Z | withdrawal | 246        | 279                      |
| 321         | 2020-04-04T00:00:00.000Z | deposit    | 785        | 1064                     |
| 322         | 2020-01-05T00:00:00.000Z | deposit    | 965        | 965                      |
| 322         | 2020-01-29T00:00:00.000Z | deposit    | 984        | 1949                     |
| 322         | 2020-02-01T00:00:00.000Z | deposit    | 328        | 2277                     |
| 322         | 2020-02-02T00:00:00.000Z | deposit    | 337        | 2614                     |
| 322         | 2020-02-15T00:00:00.000Z | deposit    | 838        | 3452                     |
| 322         | 2020-02-20T00:00:00.000Z | withdrawal | 51         | 3788                     |
| 322         | 2020-02-20T00:00:00.000Z | withdrawal | 285        | 3788                     |
| 322         | 2020-02-26T00:00:00.000Z | withdrawal | 645        | 4433                     |
| 322         | 2020-03-09T00:00:00.000Z | deposit    | 371        | 4804                     |
| 322         | 2020-03-12T00:00:00.000Z | purchase   | 492        | 4312                     |
| 322         | 2020-03-18T00:00:00.000Z | withdrawal | 539        | 4851                     |
| 323         | 2020-01-21T00:00:00.000Z | deposit    | 603        | 603                      |
| 323         | 2020-01-23T00:00:00.000Z | deposit    | 720        | 1323                     |
| 323         | 2020-02-13T00:00:00.000Z | withdrawal | 311        | 1634                     |
| 323         | 2020-02-20T00:00:00.000Z | withdrawal | 928        | 2562                     |
| 323         | 2020-02-21T00:00:00.000Z | withdrawal | 931        | 3493                     |
| 323         | 2020-02-24T00:00:00.000Z | withdrawal | 729        | 4222                     |
| 323         | 2020-02-25T00:00:00.000Z | withdrawal | 304        | 4526                     |
| 323         | 2020-03-10T00:00:00.000Z | purchase   | 959        | 3567                     |
| 323         | 2020-03-13T00:00:00.000Z | purchase   | 166        | 3401                     |
| 323         | 2020-03-16T00:00:00.000Z | withdrawal | 301        | 3702                     |
| 323         | 2020-03-18T00:00:00.000Z | withdrawal | 980        | 4682                     |
| 323         | 2020-03-21T00:00:00.000Z | deposit    | 90         | 4772                     |
| 323         | 2020-04-01T00:00:00.000Z | purchase   | 825        | 3947                     |
| 323         | 2020-04-09T00:00:00.000Z | deposit    | 102        | 4049                     |
| 323         | 2020-04-11T00:00:00.000Z | purchase   | 558        | 3491                     |
| 323         | 2020-04-16T00:00:00.000Z | deposit    | 256        | 3747                     |
| 324         | 2020-01-04T00:00:00.000Z | deposit    | 538        | 1021                     |
| 324         | 2020-01-04T00:00:00.000Z | deposit    | 483        | 1021                     |
| 324         | 2020-01-28T00:00:00.000Z | purchase   | 818        | 203                      |
| 324         | 2020-02-09T00:00:00.000Z | deposit    | 764        | 967                      |
| 324         | 2020-03-22T00:00:00.000Z | deposit    | 185        | 1152                     |
| 324         | 2020-03-29T00:00:00.000Z | deposit    | 987        | 2808                     |
| 324         | 2020-03-29T00:00:00.000Z | withdrawal | 669        | 2808                     |
| 325         | 2020-01-27T00:00:00.000Z | deposit    | 60         | 60                       |
| 325         | 2020-02-06T00:00:00.000Z | withdrawal | 274        | 334                      |
| 325         | 2020-02-16T00:00:00.000Z | withdrawal | 725        | 1059                     |
| 325         | 2020-02-21T00:00:00.000Z | withdrawal | 939        | 1998                     |
| 325         | 2020-03-01T00:00:00.000Z | deposit    | 959        | 2957                     |
| 325         | 2020-03-10T00:00:00.000Z | purchase   | 114        | 2843                     |
| 325         | 2020-03-11T00:00:00.000Z | purchase   | 499        | 2344                     |
| 325         | 2020-03-23T00:00:00.000Z | deposit    | 384        | 2728                     |
| 325         | 2020-03-28T00:00:00.000Z | purchase   | 714        | 2014                     |
| 326         | 2020-01-12T00:00:00.000Z | deposit    | 478        | 478                      |
| 326         | 2020-01-18T00:00:00.000Z | purchase   | 689        | -211                     |
| 326         | 2020-02-09T00:00:00.000Z | deposit    | 628        | 417                      |
| 327         | 2020-01-14T00:00:00.000Z | deposit    | 299        | 299                      |
| 327         | 2020-01-22T00:00:00.000Z | deposit    | 620        | 919                      |
| 327         | 2020-03-14T00:00:00.000Z | purchase   | 680        | 239                      |
| 327         | 2020-03-22T00:00:00.000Z | purchase   | 562        | -323                     |
| 327         | 2020-03-27T00:00:00.000Z | deposit    | 624        | -164                     |
| 327         | 2020-03-27T00:00:00.000Z | purchase   | 465        | -164                     |
| 328         | 2020-01-22T00:00:00.000Z | deposit    | 393        | 1090                     |
| 328         | 2020-01-22T00:00:00.000Z | withdrawal | 697        | 1090                     |
| 328         | 2020-01-28T00:00:00.000Z | purchase   | 409        | 681                      |
| 328         | 2020-01-30T00:00:00.000Z | purchase   | 519        | 162                      |
| 328         | 2020-02-03T00:00:00.000Z | purchase   | 639        | -477                     |
| 328         | 2020-02-10T00:00:00.000Z | withdrawal | 443        | -34                      |
| 328         | 2020-02-20T00:00:00.000Z | purchase   | 931        | -965                     |
| 328         | 2020-02-22T00:00:00.000Z | withdrawal | 181        | -784                     |
| 328         | 2020-03-01T00:00:00.000Z | deposit    | 721        | -63                      |
| 328         | 2020-03-04T00:00:00.000Z | purchase   | 585        | 40                       |
| 328         | 2020-03-04T00:00:00.000Z | withdrawal | 688        | 40                       |
| 328         | 2020-03-05T00:00:00.000Z | deposit    | 106        | 146                      |
| 328         | 2020-03-10T00:00:00.000Z | purchase   | 499        | -353                     |
| 328         | 2020-03-14T00:00:00.000Z | withdrawal | 819        | 466                      |
| 328         | 2020-03-18T00:00:00.000Z | deposit    | 418        | 884                      |
| 328         | 2020-03-19T00:00:00.000Z | deposit    | 493        | 1377                     |
| 328         | 2020-03-31T00:00:00.000Z | purchase   | 424        | 953                      |
| 328         | 2020-04-03T00:00:00.000Z | deposit    | 726        | 1679                     |
| 328         | 2020-04-10T00:00:00.000Z | purchase   | 582        | 1097                     |
| 329         | 2020-01-07T00:00:00.000Z | deposit    | 723        | 723                      |
| 329         | 2020-01-22T00:00:00.000Z | deposit    | 108        | 831                      |
| 329         | 2020-02-04T00:00:00.000Z | deposit    | 571        | 1402                     |
| 329         | 2020-02-14T00:00:00.000Z | withdrawal | 662        | 2064                     |
| 329         | 2020-02-15T00:00:00.000Z | withdrawal | 144        | 2208                     |
| 329         | 2020-02-22T00:00:00.000Z | purchase   | 594        | 1614                     |
| 329         | 2020-03-12T00:00:00.000Z | withdrawal | 253        | 1867                     |
| 329         | 2020-03-22T00:00:00.000Z | withdrawal | 375        | 2242                     |
| 329         | 2020-04-01T00:00:00.000Z | deposit    | 932        | 3174                     |
| 329         | 2020-04-03T00:00:00.000Z | deposit    | 103        | 3875                     |
| 329         | 2020-04-03T00:00:00.000Z | deposit    | 598        | 3875                     |
| 329         | 2020-04-04T00:00:00.000Z | purchase   | 271        | 3604                     |
| 330         | 2020-01-26T00:00:00.000Z | deposit    | 540        | 540                      |
| 330         | 2020-01-28T00:00:00.000Z | deposit    | 286        | 826                      |
| 330         | 2020-02-09T00:00:00.000Z | deposit    | 771        | 1597                     |
| 330         | 2020-02-18T00:00:00.000Z | withdrawal | 856        | 2453                     |
| 330         | 2020-02-19T00:00:00.000Z | deposit    | 498        | 2951                     |
| 330         | 2020-02-28T00:00:00.000Z | purchase   | 140        | 2811                     |
| 330         | 2020-03-01T00:00:00.000Z | purchase   | 640        | 2171                     |
| 330         | 2020-03-05T00:00:00.000Z | deposit    | 871        | 3042                     |
| 330         | 2020-03-08T00:00:00.000Z | deposit    | 356        | 3398                     |
| 330         | 2020-03-11T00:00:00.000Z | purchase   | 43         | 3355                     |
| 330         | 2020-03-13T00:00:00.000Z | deposit    | 40         | 3395                     |
| 330         | 2020-03-24T00:00:00.000Z | purchase   | 784        | 2611                     |
| 330         | 2020-03-25T00:00:00.000Z | purchase   | 943        | 1668                     |
| 330         | 2020-03-31T00:00:00.000Z | withdrawal | 622        | 2290                     |
| 330         | 2020-04-04T00:00:00.000Z | purchase   | 808        | 1482                     |
| 331         | 2020-01-17T00:00:00.000Z | deposit    | 951        | 951                      |
| 331         | 2020-01-19T00:00:00.000Z | withdrawal | 385        | 1336                     |
| 331         | 2020-01-24T00:00:00.000Z | deposit    | 443        | 1779                     |
| 331         | 2020-01-27T00:00:00.000Z | purchase   | 427        | 1352                     |
| 331         | 2020-01-29T00:00:00.000Z | withdrawal | 636        | 1988                     |
| 331         | 2020-02-06T00:00:00.000Z | deposit    | 321        | 2309                     |
| 331         | 2020-02-11T00:00:00.000Z | withdrawal | 561        | 2870                     |
| 331         | 2020-02-12T00:00:00.000Z | purchase   | 232        | 2638                     |
| 331         | 2020-02-15T00:00:00.000Z | withdrawal | 15         | 2653                     |
| 331         | 2020-02-18T00:00:00.000Z | withdrawal | 588        | 3241                     |
| 331         | 2020-02-19T00:00:00.000Z | deposit    | 956        | 4197                     |
| 331         | 2020-03-02T00:00:00.000Z | withdrawal | 17         | 4214                     |
| 331         | 2020-03-07T00:00:00.000Z | deposit    | 488        | 4702                     |
| 331         | 2020-03-09T00:00:00.000Z | purchase   | 895        | 3807                     |
| 331         | 2020-03-24T00:00:00.000Z | purchase   | 330        | 3477                     |
| 331         | 2020-03-29T00:00:00.000Z | withdrawal | 22         | 3499                     |
| 332         | 2020-01-27T00:00:00.000Z | deposit    | 594        | 594                      |
| 332         | 2020-01-29T00:00:00.000Z | withdrawal | 392        | 986                      |
| 332         | 2020-02-10T00:00:00.000Z | purchase   | 165        | 821                      |
| 332         | 2020-02-15T00:00:00.000Z | purchase   | 467        | 354                      |
| 332         | 2020-02-19T00:00:00.000Z | purchase   | 172        | 927                      |
| 332         | 2020-02-19T00:00:00.000Z | deposit    | 745        | 927                      |
| 332         | 2020-02-21T00:00:00.000Z | purchase   | 715        | -104                     |
| 332         | 2020-02-21T00:00:00.000Z | purchase   | 316        | -104                     |
| 332         | 2020-02-23T00:00:00.000Z | deposit    | 726        | 622                      |
| 332         | 2020-02-25T00:00:00.000Z | deposit    | 721        | 1343                     |
| 332         | 2020-03-12T00:00:00.000Z | deposit    | 909        | 2252                     |
| 332         | 2020-03-15T00:00:00.000Z | withdrawal | 132        | 2384                     |
| 332         | 2020-03-24T00:00:00.000Z | withdrawal | 842        | 3226                     |
| 332         | 2020-04-05T00:00:00.000Z | purchase   | 221        | 3005                     |
| 332         | 2020-04-09T00:00:00.000Z | withdrawal | 360        | 3365                     |
| 332         | 2020-04-19T00:00:00.000Z | deposit    | 841        | 4168                     |
| 332         | 2020-04-19T00:00:00.000Z | purchase   | 38         | 4168                     |
| 332         | 2020-04-20T00:00:00.000Z | deposit    | 14         | 4182                     |
| 332         | 2020-04-22T00:00:00.000Z | withdrawal | 60         | 4242                     |
| 333         | 2020-01-08T00:00:00.000Z | purchase   | 481        | 56                       |
| 333         | 2020-01-08T00:00:00.000Z | deposit    | 537        | 56                       |
| 333         | 2020-01-13T00:00:00.000Z | purchase   | 140        | -84                      |
| 333         | 2020-01-16T00:00:00.000Z | deposit    | 830        | 746                      |
| 333         | 2020-01-28T00:00:00.000Z | purchase   | 975        | -229                     |
| 333         | 2020-02-16T00:00:00.000Z | deposit    | 501        | 272                      |
| 333         | 2020-02-17T00:00:00.000Z | deposit    | 295        | 567                      |
| 333         | 2020-02-21T00:00:00.000Z | withdrawal | 499        | 1066                     |
| 333         | 2020-02-25T00:00:00.000Z | purchase   | 195        | 871                      |
| 333         | 2020-03-12T00:00:00.000Z | deposit    | 968        | 1839                     |
| 333         | 2020-03-24T00:00:00.000Z | deposit    | 587        | 2451                     |
| 333         | 2020-03-24T00:00:00.000Z | deposit    | 25         | 2451                     |
| 333         | 2020-03-25T00:00:00.000Z | purchase   | 886        | 1565                     |
| 333         | 2020-04-04T00:00:00.000Z | deposit    | 353        | 1918                     |
| 334         | 2020-01-15T00:00:00.000Z | deposit    | 933        | 933                      |
| 334         | 2020-01-25T00:00:00.000Z | deposit    | 244        | 1177                     |
| 334         | 2020-02-07T00:00:00.000Z | deposit    | 706        | 1883                     |
| 334         | 2020-02-12T00:00:00.000Z | deposit    | 280        | 2163                     |
| 334         | 2020-02-23T00:00:00.000Z | deposit    | 561        | 2724                     |
| 334         | 2020-03-03T00:00:00.000Z | deposit    | 248        | 2972                     |
| 334         | 2020-03-19T00:00:00.000Z | withdrawal | 547        | 3519                     |
| 334         | 2020-04-10T00:00:00.000Z | withdrawal | 811        | 4330                     |
| 335         | 2020-01-14T00:00:00.000Z | deposit    | 663        | 663                      |
| 335         | 2020-01-27T00:00:00.000Z | purchase   | 93         | 570                      |
| 335         | 2020-02-07T00:00:00.000Z | deposit    | 217        | 709                      |
| 335         | 2020-02-07T00:00:00.000Z | purchase   | 78         | 709                      |
| 335         | 2020-02-12T00:00:00.000Z | purchase   | 816        | -107                     |
| 335         | 2020-02-27T00:00:00.000Z | withdrawal | 247        | 140                      |
| 335         | 2020-03-03T00:00:00.000Z | withdrawal | 641        | 781                      |
| 335         | 2020-03-10T00:00:00.000Z | deposit    | 586        | 1367                     |
| 335         | 2020-03-24T00:00:00.000Z | deposit    | 227        | 1594                     |
| 335         | 2020-03-30T00:00:00.000Z | deposit    | 605        | 2199                     |
| 336         | 2020-01-16T00:00:00.000Z | deposit    | 543        | 543                      |
| 336         | 2020-02-08T00:00:00.000Z | purchase   | 457        | 86                       |
| 336         | 2020-02-15T00:00:00.000Z | withdrawal | 681        | 767                      |
| 336         | 2020-03-02T00:00:00.000Z | deposit    | 730        | 1497                     |
| 336         | 2020-04-06T00:00:00.000Z | deposit    | 464        | 1961                     |
| 337         | 2020-01-12T00:00:00.000Z | deposit    | 581        | 581                      |
| 337         | 2020-01-31T00:00:00.000Z | withdrawal | 845        | 1426                     |
| 337         | 2020-02-10T00:00:00.000Z | deposit    | 658        | 2084                     |
| 337         | 2020-02-21T00:00:00.000Z | withdrawal | 224        | 2308                     |
| 337         | 2020-03-09T00:00:00.000Z | deposit    | 549        | 2857                     |
| 337         | 2020-03-21T00:00:00.000Z | withdrawal | 159        | 3016                     |
| 337         | 2020-03-25T00:00:00.000Z | deposit    | 890        | 3906                     |
| 337         | 2020-04-04T00:00:00.000Z | deposit    | 154        | 4060                     |
| 337         | 2020-04-06T00:00:00.000Z | deposit    | 7          | 3770                     |
| 337         | 2020-04-06T00:00:00.000Z | purchase   | 297        | 3770                     |
| 338         | 2020-01-17T00:00:00.000Z | deposit    | 628        | 880                      |
| 338         | 2020-01-17T00:00:00.000Z | deposit    | 252        | 880                      |
| 338         | 2020-01-26T00:00:00.000Z | purchase   | 618        | 262                      |
| 338         | 2020-02-04T00:00:00.000Z | purchase   | 681        | -419                     |
| 338         | 2020-02-08T00:00:00.000Z | deposit    | 859        | 440                      |
| 338         | 2020-02-19T00:00:00.000Z | deposit    | 529        | 969                      |
| 338         | 2020-02-25T00:00:00.000Z | withdrawal | 436        | 1405                     |
| 338         | 2020-03-09T00:00:00.000Z | deposit    | 859        | 2264                     |
| 338         | 2020-03-12T00:00:00.000Z | deposit    | 793        | 3057                     |
| 338         | 2020-03-13T00:00:00.000Z | withdrawal | 116        | 3173                     |
| 338         | 2020-03-25T00:00:00.000Z | deposit    | 698        | 3871                     |
| 338         | 2020-04-03T00:00:00.000Z | purchase   | 808        | 2368                     |
| 338         | 2020-04-03T00:00:00.000Z | purchase   | 695        | 2368                     |
| 339         | 2020-01-10T00:00:00.000Z | deposit    | 167        | 167                      |
| 339         | 2020-01-14T00:00:00.000Z | purchase   | 173        | -6                       |
| 339         | 2020-01-17T00:00:00.000Z | purchase   | 7          | -13                      |
| 339         | 2020-01-24T00:00:00.000Z | deposit    | 136        | 123                      |
| 339         | 2020-01-31T00:00:00.000Z | purchase   | 903        | -780                     |
| 339         | 2020-02-02T00:00:00.000Z | deposit    | 994        | 214                      |
| 339         | 2020-02-06T00:00:00.000Z | withdrawal | 717        | 931                      |
| 339         | 2020-02-15T00:00:00.000Z | deposit    | 811        | 1742                     |
| 339         | 2020-02-16T00:00:00.000Z | deposit    | 251        | 1993                     |
| 339         | 2020-02-24T00:00:00.000Z | purchase   | 231        | 2522                     |
| 339         | 2020-02-24T00:00:00.000Z | deposit    | 222        | 2522                     |
| 339         | 2020-02-24T00:00:00.000Z | deposit    | 538        | 2522                     |
| 339         | 2020-03-06T00:00:00.000Z | purchase   | 68         | 2454                     |
| 339         | 2020-03-07T00:00:00.000Z | deposit    | 548        | 3002                     |
| 339         | 2020-03-09T00:00:00.000Z | purchase   | 85         | 2917                     |
| 339         | 2020-03-15T00:00:00.000Z | withdrawal | 45         | 2962                     |
| 339         | 2020-03-23T00:00:00.000Z | withdrawal | 813        | 3775                     |
| 340         | 2020-01-06T00:00:00.000Z | deposit    | 56         | 56                       |
| 340         | 2020-01-18T00:00:00.000Z | withdrawal | 699        | 312                      |
| 340         | 2020-01-18T00:00:00.000Z | purchase   | 443        | 312                      |
| 340         | 2020-02-04T00:00:00.000Z | purchase   | 17         | 295                      |
| 340         | 2020-02-06T00:00:00.000Z | deposit    | 644        | 939                      |
| 340         | 2020-02-13T00:00:00.000Z | deposit    | 880        | 1819                     |
| 340         | 2020-02-14T00:00:00.000Z | purchase   | 529        | 1290                     |
| 340         | 2020-02-18T00:00:00.000Z | purchase   | 546        | 744                      |
| 340         | 2020-02-19T00:00:00.000Z | deposit    | 930        | 1674                     |
| 340         | 2020-03-02T00:00:00.000Z | deposit    | 154        | 1828                     |
| 340         | 2020-03-13T00:00:00.000Z | withdrawal | 874        | 2702                     |
| 340         | 2020-03-15T00:00:00.000Z | deposit    | 665        | 3367                     |
| 340         | 2020-03-17T00:00:00.000Z | deposit    | 203        | 3570                     |
| 340         | 2020-03-18T00:00:00.000Z | withdrawal | 756        | 4682                     |
| 340         | 2020-03-18T00:00:00.000Z | deposit    | 356        | 4682                     |
| 340         | 2020-03-21T00:00:00.000Z | deposit    | 619        | 5301                     |
| 340         | 2020-03-24T00:00:00.000Z | deposit    | 547        | 5848                     |
| 340         | 2020-03-30T00:00:00.000Z | purchase   | 631        | 5217                     |
| 340         | 2020-04-01T00:00:00.000Z | deposit    | 831        | 6048                     |
| 341         | 2020-01-26T00:00:00.000Z | deposit    | 345        | 345                      |
| 341         | 2020-02-12T00:00:00.000Z | deposit    | 77         | 422                      |
| 341         | 2020-02-26T00:00:00.000Z | withdrawal | 576        | 998                      |
| 341         | 2020-02-27T00:00:00.000Z | purchase   | 719        | 279                      |
| 341         | 2020-03-10T00:00:00.000Z | withdrawal | 310        | 589                      |
| 341         | 2020-03-19T00:00:00.000Z | withdrawal | 958        | 1547                     |
| 341         | 2020-03-30T00:00:00.000Z | deposit    | 8          | 1555                     |
| 341         | 2020-04-18T00:00:00.000Z | withdrawal | 168        | 1723                     |
| 341         | 2020-04-24T00:00:00.000Z | deposit    | 207        | 1930                     |
| 342         | 2020-01-25T00:00:00.000Z | deposit    | 347        | 347                      |
| 342         | 2020-02-12T00:00:00.000Z | deposit    | 910        | 1257                     |
| 342         | 2020-02-17T00:00:00.000Z | purchase   | 715        | 542                      |
| 342         | 2020-02-24T00:00:00.000Z | purchase   | 887        | -345                     |
| 342         | 2020-02-27T00:00:00.000Z | deposit    | 60         | -285                     |
| 342         | 2020-03-08T00:00:00.000Z | withdrawal | 947        | 662                      |
| 342         | 2020-03-25T00:00:00.000Z | deposit    | 990        | 1652                     |
| 342         | 2020-03-26T00:00:00.000Z | deposit    | 745        | 2397                     |
| 342         | 2020-04-07T00:00:00.000Z | purchase   | 688        | 1709                     |
| 342         | 2020-04-20T00:00:00.000Z | deposit    | 624        | 2333                     |
| 342         | 2020-04-22T00:00:00.000Z | withdrawal | 574        | 2907                     |
| 343         | 2020-01-01T00:00:00.000Z | deposit    | 859        | 859                      |
| 343         | 2020-01-09T00:00:00.000Z | withdrawal | 426        | 1285                     |
| 343         | 2020-01-14T00:00:00.000Z | withdrawal | 30         | 1315                     |
| 343         | 2020-01-20T00:00:00.000Z | deposit    | 936        | 2251                     |
| 343         | 2020-02-01T00:00:00.000Z | deposit    | 214        | 2876                     |
| 343         | 2020-02-01T00:00:00.000Z | deposit    | 411        | 2876                     |
| 343         | 2020-02-05T00:00:00.000Z | deposit    | 150        | 3026                     |
| 343         | 2020-02-13T00:00:00.000Z | withdrawal | 286        | 3312                     |
| 343         | 2020-02-24T00:00:00.000Z | purchase   | 303        | 3009                     |
| 343         | 2020-02-26T00:00:00.000Z | deposit    | 128        | 3137                     |
| 343         | 2020-03-01T00:00:00.000Z | deposit    | 267        | 3404                     |
| 343         | 2020-03-09T00:00:00.000Z | withdrawal | 832        | 4236                     |
| 343         | 2020-03-23T00:00:00.000Z | deposit    | 753        | 4989                     |
| 344         | 2020-01-07T00:00:00.000Z | deposit    | 816        | 816                      |
| 344         | 2020-01-11T00:00:00.000Z | withdrawal | 148        | 964                      |
| 344         | 2020-01-15T00:00:00.000Z | deposit    | 368        | 1332                     |
| 344         | 2020-01-16T00:00:00.000Z | withdrawal | 282        | 1614                     |
| 344         | 2020-01-20T00:00:00.000Z | withdrawal | 855        | 2469                     |
| 344         | 2020-01-26T00:00:00.000Z | withdrawal | 831        | 3300                     |
| 344         | 2020-02-05T00:00:00.000Z | withdrawal | 459        | 3759                     |
| 344         | 2020-02-07T00:00:00.000Z | deposit    | 937        | 4696                     |
| 344         | 2020-02-09T00:00:00.000Z | deposit    | 553        | 5249                     |
| 344         | 2020-02-13T00:00:00.000Z | purchase   | 596        | 4653                     |
| 344         | 2020-02-19T00:00:00.000Z | purchase   | 591        | 4062                     |
| 344         | 2020-02-21T00:00:00.000Z | deposit    | 945        | 5007                     |
| 344         | 2020-02-23T00:00:00.000Z | deposit    | 558        | 5565                     |
| 344         | 2020-02-29T00:00:00.000Z | deposit    | 90         | 5655                     |
| 344         | 2020-03-03T00:00:00.000Z | withdrawal | 981        | 6636                     |
| 344         | 2020-03-07T00:00:00.000Z | purchase   | 3          | 6633                     |
| 344         | 2020-03-12T00:00:00.000Z | deposit    | 416        | 7049                     |
| 344         | 2020-03-13T00:00:00.000Z | deposit    | 629        | 7678                     |
| 344         | 2020-03-19T00:00:00.000Z | deposit    | 704        | 8382                     |
| 344         | 2020-03-27T00:00:00.000Z | deposit    | 308        | 8793                     |
| 344         | 2020-03-27T00:00:00.000Z | withdrawal | 103        | 8793                     |
| 345         | 2020-01-01T00:00:00.000Z | purchase   | 964        | -409                     |
| 345         | 2020-01-01T00:00:00.000Z | deposit    | 555        | -409                     |
| 345         | 2020-01-08T00:00:00.000Z | purchase   | 289        | -698                     |
| 345         | 2020-01-25T00:00:00.000Z | deposit    | 598        | -100                     |
| 345         | 2020-02-04T00:00:00.000Z | purchase   | 550        | -650                     |
| 345         | 2020-03-05T00:00:00.000Z | purchase   | 936        | -1586                    |
| 345         | 2020-03-28T00:00:00.000Z | purchase   | 702        | -2288                    |
| 346         | 2020-01-21T00:00:00.000Z | deposit    | 916        | 916                      |
| 346         | 2020-02-12T00:00:00.000Z | withdrawal | 805        | 1721                     |
| 346         | 2020-02-14T00:00:00.000Z | withdrawal | 563        | 2284                     |
| 346         | 2020-02-23T00:00:00.000Z | withdrawal | 600        | 2884                     |
| 346         | 2020-04-01T00:00:00.000Z | withdrawal | 790        | 3674                     |
| 346         | 2020-04-02T00:00:00.000Z | withdrawal | 124        | 4336                     |
| 346         | 2020-04-02T00:00:00.000Z | deposit    | 538        | 4336                     |
| 346         | 2020-04-03T00:00:00.000Z | deposit    | 605        | 3948                     |
| 346         | 2020-04-03T00:00:00.000Z | purchase   | 993        | 3948                     |
| 346         | 2020-04-04T00:00:00.000Z | deposit    | 91         | 4479                     |
| 346         | 2020-04-04T00:00:00.000Z | withdrawal | 440        | 4479                     |
| 346         | 2020-04-09T00:00:00.000Z | withdrawal | 505        | 4984                     |
| 346         | 2020-04-15T00:00:00.000Z | withdrawal | 850        | 5834                     |
| 346         | 2020-04-18T00:00:00.000Z | purchase   | 282        | 5552                     |
| 347         | 2020-01-04T00:00:00.000Z | deposit    | 626        | 626                      |
| 347         | 2020-01-13T00:00:00.000Z | purchase   | 232        | 394                      |
| 347         | 2020-02-23T00:00:00.000Z | withdrawal | 942        | 1336                     |
| 347         | 2020-02-29T00:00:00.000Z | withdrawal | 227        | 1563                     |
| 347         | 2020-03-06T00:00:00.000Z | withdrawal | 194        | 1757                     |
| 347         | 2020-03-16T00:00:00.000Z | deposit    | 68         | 1825                     |
| 347         | 2020-03-20T00:00:00.000Z | purchase   | 737        | 1088                     |
| 347         | 2020-03-24T00:00:00.000Z | purchase   | 705        | 1353                     |
| 347         | 2020-03-24T00:00:00.000Z | deposit    | 970        | 1353                     |
| 347         | 2020-03-31T00:00:00.000Z | purchase   | 395        | 958                      |
| 348         | 2020-01-22T00:00:00.000Z | deposit    | 26         | 26                       |
| 348         | 2020-01-30T00:00:00.000Z | purchase   | 797        | -771                     |
| 348         | 2020-02-06T00:00:00.000Z | deposit    | 885        | 114                      |
| 348         | 2020-03-12T00:00:00.000Z | deposit    | 454        | 568                      |
| 348         | 2020-03-13T00:00:00.000Z | withdrawal | 468        | 1036                     |
| 348         | 2020-03-16T00:00:00.000Z | purchase   | 255        | 781                      |
| 348         | 2020-04-14T00:00:00.000Z | deposit    | 329        | 1110                     |
| 348         | 2020-04-15T00:00:00.000Z | deposit    | 719        | 1829                     |
| 348         | 2020-04-16T00:00:00.000Z | purchase   | 845        | 984                      |
| 349         | 2020-01-17T00:00:00.000Z | deposit    | 573        | 573                      |
| 349         | 2020-01-18T00:00:00.000Z | purchase   | 981        | -408                     |
| 349         | 2020-01-31T00:00:00.000Z | withdrawal | 436        | 28                       |
| 349         | 2020-02-01T00:00:00.000Z | deposit    | 498        | 526                      |
| 349         | 2020-02-08T00:00:00.000Z | deposit    | 362        | 888                      |
| 349         | 2020-02-15T00:00:00.000Z | purchase   | 171        | 717                      |
| 349         | 2020-02-26T00:00:00.000Z | withdrawal | 885        | 1602                     |
| 349         | 2020-03-02T00:00:00.000Z | deposit    | 49         | 1651                     |
| 349         | 2020-03-03T00:00:00.000Z | deposit    | 747        | 2398                     |
| 349         | 2020-03-10T00:00:00.000Z | withdrawal | 818        | 3216                     |
| 349         | 2020-03-20T00:00:00.000Z | deposit    | 934        | 4150                     |
| 349         | 2020-03-27T00:00:00.000Z | withdrawal | 109        | 5140                     |
| 349         | 2020-03-27T00:00:00.000Z | deposit    | 881        | 5140                     |
| 349         | 2020-03-28T00:00:00.000Z | deposit    | 665        | 5805                     |
| 349         | 2020-04-03T00:00:00.000Z | deposit    | 110        | 5915                     |
| 349         | 2020-04-14T00:00:00.000Z | deposit    | 545        | 6460                     |
| 350         | 2020-01-13T00:00:00.000Z | deposit    | 167        | 167                      |
| 350         | 2020-01-18T00:00:00.000Z | deposit    | 726        | 893                      |
| 350         | 2020-01-23T00:00:00.000Z | deposit    | 924        | 1817                     |
| 350         | 2020-01-27T00:00:00.000Z | deposit    | 383        | 2200                     |
| 350         | 2020-02-02T00:00:00.000Z | purchase   | 440        | 1760                     |
| 350         | 2020-02-12T00:00:00.000Z | deposit    | 261        | 2021                     |
| 350         | 2020-02-13T00:00:00.000Z | withdrawal | 165        | 2335                     |
| 350         | 2020-02-13T00:00:00.000Z | withdrawal | 149        | 2335                     |
| 350         | 2020-02-16T00:00:00.000Z | purchase   | 144        | 2191                     |
| 350         | 2020-02-28T00:00:00.000Z | withdrawal | 483        | 2674                     |
| 350         | 2020-03-02T00:00:00.000Z | withdrawal | 352        | 3026                     |
| 350         | 2020-03-05T00:00:00.000Z | purchase   | 171        | 2855                     |
| 350         | 2020-03-16T00:00:00.000Z | deposit    | 154        | 3009                     |
| 350         | 2020-03-23T00:00:00.000Z | purchase   | 947        | 2786                     |
| 350         | 2020-03-23T00:00:00.000Z | deposit    | 724        | 2786                     |
| 350         | 2020-03-27T00:00:00.000Z | purchase   | 662        | 2124                     |
| 350         | 2020-04-05T00:00:00.000Z | purchase   | 345        | 1779                     |
| 350         | 2020-04-07T00:00:00.000Z | withdrawal | 714        | 2493                     |
| 351         | 2020-01-03T00:00:00.000Z | deposit    | 371        | 1322                     |
| 351         | 2020-01-03T00:00:00.000Z | deposit    | 951        | 1322                     |
| 351         | 2020-01-12T00:00:00.000Z | purchase   | 583        | 739                      |
| 351         | 2020-01-31T00:00:00.000Z | withdrawal | 649        | 1388                     |
| 351         | 2020-02-13T00:00:00.000Z | withdrawal | 729        | 2117                     |
| 351         | 2020-02-18T00:00:00.000Z | deposit    | 228        | 2345                     |
| 351         | 2020-02-19T00:00:00.000Z | purchase   | 578        | 1767                     |
| 351         | 2020-02-25T00:00:00.000Z | withdrawal | 544        | 2311                     |
| 351         | 2020-03-27T00:00:00.000Z | withdrawal | 327        | 2638                     |
| 352         | 2020-01-21T00:00:00.000Z | deposit    | 416        | 416                      |
| 352         | 2020-02-07T00:00:00.000Z | withdrawal | 989        | 1405                     |
| 352         | 2020-02-13T00:00:00.000Z | purchase   | 579        | 826                      |
| 352         | 2020-02-20T00:00:00.000Z | purchase   | 460        | 366                      |
| 352         | 2020-03-12T00:00:00.000Z | withdrawal | 699        | 1065                     |
| 352         | 2020-03-14T00:00:00.000Z | purchase   | 250        | 815                      |
| 352         | 2020-03-20T00:00:00.000Z | deposit    | 787        | 1602                     |
| 352         | 2020-04-11T00:00:00.000Z | purchase   | 874        | 728                      |
| 352         | 2020-04-14T00:00:00.000Z | deposit    | 379        | 1107                     |
| 353         | 2020-01-01T00:00:00.000Z | deposit    | 57         | 57                       |
| 353         | 2020-01-13T00:00:00.000Z | purchase   | 935        | -878                     |
| 353         | 2020-01-19T00:00:00.000Z | deposit    | 898        | 20                       |
| 353         | 2020-01-26T00:00:00.000Z | withdrawal | 575        | 595                      |
| 353         | 2020-02-04T00:00:00.000Z | purchase   | 523        | 72                       |
| 353         | 2020-02-21T00:00:00.000Z | purchase   | 741        | -669                     |
| 353         | 2020-03-11T00:00:00.000Z | withdrawal | 738        | 69                       |
| 353         | 2020-03-12T00:00:00.000Z | deposit    | 846        | 1675                     |
| 353         | 2020-03-12T00:00:00.000Z | deposit    | 760        | 1675                     |
| 353         | 2020-03-21T00:00:00.000Z | deposit    | 435        | 2110                     |
| 354         | 2020-01-23T00:00:00.000Z | deposit    | 822        | 822                      |
| 354         | 2020-03-17T00:00:00.000Z | purchase   | 664        | 158                      |
| 355         | 2020-01-21T00:00:00.000Z | deposit    | 367        | 367                      |
| 355         | 2020-01-24T00:00:00.000Z | purchase   | 612        | -245                     |
| 355         | 2020-02-09T00:00:00.000Z | deposit    | 767        | 522                      |
| 355         | 2020-02-18T00:00:00.000Z | purchase   | 716        | -194                     |
| 355         | 2020-03-24T00:00:00.000Z | purchase   | 943        | -1137                    |
| 355         | 2020-04-08T00:00:00.000Z | withdrawal | 630        | -507                     |
| 355         | 2020-04-19T00:00:00.000Z | deposit    | 915        | 408                      |
| 356         | 2020-01-11T00:00:00.000Z | deposit    | 568        | 568                      |
| 356         | 2020-01-13T00:00:00.000Z | withdrawal | 532        | 1100                     |
| 356         | 2020-01-17T00:00:00.000Z | purchase   | 733        | 367                      |
| 356         | 2020-01-19T00:00:00.000Z | withdrawal | 553        | 920                      |
| 356         | 2020-01-22T00:00:00.000Z | deposit    | 607        | 1527                     |
| 356         | 2020-01-29T00:00:00.000Z | withdrawal | 783        | 2310                     |
| 356         | 2020-01-31T00:00:00.000Z | purchase   | 444        | 1866                     |
| 356         | 2020-02-01T00:00:00.000Z | withdrawal | 752        | 2618                     |
| 356         | 2020-02-11T00:00:00.000Z | purchase   | 349        | 2269                     |
| 356         | 2020-02-15T00:00:00.000Z | purchase   | 681        | 1588                     |
| 356         | 2020-02-22T00:00:00.000Z | withdrawal | 277        | 1865                     |
| 356         | 2020-03-13T00:00:00.000Z | withdrawal | 828        | 2693                     |
| 356         | 2020-03-22T00:00:00.000Z | purchase   | 654        | 2039                     |
| 356         | 2020-03-25T00:00:00.000Z | withdrawal | 568        | 2607                     |
| 356         | 2020-03-26T00:00:00.000Z | purchase   | 539        | 2068                     |
| 356         | 2020-04-06T00:00:00.000Z | deposit    | 953        | 3021                     |
| 356         | 2020-04-09T00:00:00.000Z | withdrawal | 673        | 4338                     |
| 356         | 2020-04-09T00:00:00.000Z | withdrawal | 644        | 4338                     |
| 357         | 2020-01-20T00:00:00.000Z | deposit    | 780        | 780                      |
| 357         | 2020-02-05T00:00:00.000Z | withdrawal | 136        | 916                      |
| 357         | 2020-02-19T00:00:00.000Z | deposit    | 138        | 1054                     |
| 357         | 2020-02-27T00:00:00.000Z | deposit    | 96         | 1150                     |
| 357         | 2020-03-28T00:00:00.000Z | withdrawal | 382        | 1532                     |
| 357         | 2020-04-16T00:00:00.000Z | withdrawal | 684        | 2216                     |
| 358         | 2020-01-15T00:00:00.000Z | deposit    | 129        | 129                      |
| 358         | 2020-01-16T00:00:00.000Z | purchase   | 582        | -453                     |
| 358         | 2020-01-25T00:00:00.000Z | withdrawal | 992        | 539                      |
| 358         | 2020-01-29T00:00:00.000Z | deposit    | 383        | 922                      |
| 358         | 2020-02-02T00:00:00.000Z | deposit    | 443        | 1365                     |
| 358         | 2020-03-02T00:00:00.000Z | purchase   | 340        | 1025                     |
| 358         | 2020-03-07T00:00:00.000Z | deposit    | 906        | 1931                     |
| 358         | 2020-03-30T00:00:00.000Z | purchase   | 830        | 1101                     |
| 358         | 2020-04-02T00:00:00.000Z | deposit    | 175        | 1276                     |
| 359         | 2020-01-09T00:00:00.000Z | deposit    | 10         | 10                       |
| 359         | 2020-01-10T00:00:00.000Z | deposit    | 915        | 925                      |
| 359         | 2020-01-20T00:00:00.000Z | deposit    | 136        | 1061                     |
| 359         | 2020-01-29T00:00:00.000Z | purchase   | 171        | 890                      |
| 359         | 2020-02-09T00:00:00.000Z | deposit    | 434        | 1324                     |
| 359         | 2020-02-27T00:00:00.000Z | withdrawal | 40         | 1364                     |
| 359         | 2020-03-04T00:00:00.000Z | deposit    | 991        | 2355                     |
| 359         | 2020-03-05T00:00:00.000Z | deposit    | 845        | 3200                     |
| 359         | 2020-03-18T00:00:00.000Z | deposit    | 374        | 3574                     |
| 359         | 2020-03-24T00:00:00.000Z | withdrawal | 335        | 3909                     |
| 359         | 2020-04-07T00:00:00.000Z | purchase   | 281        | 3628                     |
| 360         | 2020-01-16T00:00:00.000Z | deposit    | 385        | 385                      |
| 360         | 2020-01-19T00:00:00.000Z | withdrawal | 77         | 462                      |
| 360         | 2020-01-20T00:00:00.000Z | deposit    | 549        | 1011                     |
| 360         | 2020-01-25T00:00:00.000Z | withdrawal | 915        | 1926                     |
| 360         | 2020-01-26T00:00:00.000Z | purchase   | 159        | 1767                     |
| 360         | 2020-01-27T00:00:00.000Z | withdrawal | 628        | 2395                     |
| 360         | 2020-01-31T00:00:00.000Z | withdrawal | 461        | 2856                     |
| 360         | 2020-02-10T00:00:00.000Z | deposit    | 912        | 3768                     |
| 360         | 2020-02-21T00:00:00.000Z | purchase   | 21         | 3747                     |
| 360         | 2020-02-23T00:00:00.000Z | withdrawal | 337        | 4084                     |
| 360         | 2020-02-27T00:00:00.000Z | withdrawal | 654        | 5717                     |
| 360         | 2020-02-27T00:00:00.000Z | deposit    | 979        | 5717                     |
| 360         | 2020-03-12T00:00:00.000Z | purchase   | 951        | 4766                     |
| 360         | 2020-03-17T00:00:00.000Z | withdrawal | 408        | 5174                     |
| 360         | 2020-03-28T00:00:00.000Z | deposit    | 531        | 5705                     |
| 360         | 2020-04-04T00:00:00.000Z | deposit    | 977        | 6682                     |
| 360         | 2020-04-06T00:00:00.000Z | purchase   | 954        | 5728                     |
| 360         | 2020-04-11T00:00:00.000Z | deposit    | 908        | 6636                     |
| 361         | 2020-01-12T00:00:00.000Z | withdrawal | 457        | 1254                     |
| 361         | 2020-01-12T00:00:00.000Z | deposit    | 797        | 1254                     |
| 361         | 2020-02-12T00:00:00.000Z | deposit    | 109        | 1363                     |
| 361         | 2020-02-21T00:00:00.000Z | deposit    | 323        | 1686                     |
| 362         | 2020-01-28T00:00:00.000Z | deposit    | 416        | 416                      |
| 362         | 2020-02-13T00:00:00.000Z | deposit    | 65         | 481                      |
| 362         | 2020-03-26T00:00:00.000Z | withdrawal | 74         | 555                      |
| 362         | 2020-03-27T00:00:00.000Z | purchase   | 971        | -416                     |
| 362         | 2020-04-10T00:00:00.000Z | deposit    | 463        | 47                       |
| 362         | 2020-04-22T00:00:00.000Z | deposit    | 716        | 763                      |
| 363         | 2020-01-06T00:00:00.000Z | deposit    | 99         | 721                      |
| 363         | 2020-01-06T00:00:00.000Z | deposit    | 622        | 721                      |
| 363         | 2020-01-29T00:00:00.000Z | deposit    | 256        | 977                      |
| 363         | 2020-02-06T00:00:00.000Z | purchase   | 551        | 426                      |
| 363         | 2020-02-10T00:00:00.000Z | withdrawal | 533        | 959                      |
| 363         | 2020-02-14T00:00:00.000Z | deposit    | 301        | 1260                     |
| 363         | 2020-02-23T00:00:00.000Z | purchase   | 812        | 448                      |
| 363         | 2020-03-01T00:00:00.000Z | withdrawal | 966        | 1414                     |
| 363         | 2020-03-04T00:00:00.000Z | purchase   | 563        | 851                      |
| 363         | 2020-03-06T00:00:00.000Z | deposit    | 266        | 1117                     |
| 363         | 2020-03-26T00:00:00.000Z | withdrawal | 462        | 1579                     |
| 363         | 2020-03-28T00:00:00.000Z | withdrawal | 722        | 2301                     |
| 363         | 2020-04-01T00:00:00.000Z | deposit    | 179        | 2480                     |
| 364         | 2020-01-10T00:00:00.000Z | deposit    | 563        | 563                      |
| 364         | 2020-01-22T00:00:00.000Z | withdrawal | 365        | 928                      |
| 364         | 2020-01-25T00:00:00.000Z | purchase   | 255        | 673                      |
| 364         | 2020-02-11T00:00:00.000Z | withdrawal | 469        | 1142                     |
| 364         | 2020-02-13T00:00:00.000Z | deposit    | 87         | 1229                     |
| 364         | 2020-02-15T00:00:00.000Z | deposit    | 846        | 2286                     |
| 364         | 2020-02-15T00:00:00.000Z | withdrawal | 211        | 2286                     |
| 364         | 2020-02-16T00:00:00.000Z | deposit    | 127        | 2413                     |
| 364         | 2020-02-21T00:00:00.000Z | purchase   | 704        | 1709                     |
| 364         | 2020-02-25T00:00:00.000Z | withdrawal | 75         | 1784                     |
| 364         | 2020-03-02T00:00:00.000Z | withdrawal | 543        | 2327                     |
| 364         | 2020-03-04T00:00:00.000Z | deposit    | 615        | 3454                     |
| 364         | 2020-03-04T00:00:00.000Z | deposit    | 512        | 3454                     |
| 364         | 2020-03-13T00:00:00.000Z | withdrawal | 241        | 3695                     |
| 364         | 2020-03-14T00:00:00.000Z | deposit    | 736        | 4431                     |
| 364         | 2020-03-17T00:00:00.000Z | deposit    | 550        | 4981                     |
| 364         | 2020-04-06T00:00:00.000Z | deposit    | 537        | 6417                     |
| 364         | 2020-04-06T00:00:00.000Z | withdrawal | 899        | 6417                     |
| 365         | 2020-01-25T00:00:00.000Z | deposit    | 595        | 595                      |
| 365         | 2020-01-26T00:00:00.000Z | withdrawal | 412        | 1007                     |
| 365         | 2020-01-28T00:00:00.000Z | withdrawal | 251        | 1258                     |
| 365         | 2020-02-04T00:00:00.000Z | deposit    | 355        | 1613                     |
| 365         | 2020-02-21T00:00:00.000Z | deposit    | 715        | 2328                     |
| 365         | 2020-02-25T00:00:00.000Z | purchase   | 462        | 1866                     |
| 365         | 2020-02-27T00:00:00.000Z | withdrawal | 296        | 2162                     |
| 365         | 2020-03-12T00:00:00.000Z | withdrawal | 750        | 2912                     |
| 365         | 2020-03-21T00:00:00.000Z | deposit    | 689        | 3601                     |
| 365         | 2020-03-25T00:00:00.000Z | purchase   | 152        | 3449                     |
| 365         | 2020-03-30T00:00:00.000Z | purchase   | 106        | 3343                     |
| 365         | 2020-04-08T00:00:00.000Z | deposit    | 469        | 3812                     |
| 365         | 2020-04-15T00:00:00.000Z | withdrawal | 229        | 4041                     |
| 365         | 2020-04-23T00:00:00.000Z | purchase   | 925        | 3116                     |
| 366         | 2020-01-21T00:00:00.000Z | deposit    | 965        | 965                      |
| 366         | 2020-01-25T00:00:00.000Z | purchase   | 708        | 257                      |
| 366         | 2020-01-26T00:00:00.000Z | withdrawal | 308        | 565                      |
| 366         | 2020-02-03T00:00:00.000Z | deposit    | 444        | 1009                     |
| 366         | 2020-02-04T00:00:00.000Z | deposit    | 9          | 1018                     |
| 366         | 2020-02-05T00:00:00.000Z | deposit    | 707        | 1725                     |
| 366         | 2020-02-12T00:00:00.000Z | deposit    | 944        | 3199                     |
| 366         | 2020-02-12T00:00:00.000Z | withdrawal | 530        | 3199                     |
| 366         | 2020-02-21T00:00:00.000Z | deposit    | 569        | 3768                     |
| 366         | 2020-02-22T00:00:00.000Z | withdrawal | 756        | 4821                     |
| 366         | 2020-02-22T00:00:00.000Z | deposit    | 297        | 4821                     |
| 366         | 2020-02-23T00:00:00.000Z | purchase   | 760        | 4880                     |
| 366         | 2020-02-23T00:00:00.000Z | withdrawal | 819        | 4880                     |
| 366         | 2020-02-24T00:00:00.000Z | withdrawal | 147        | 5027                     |
| 366         | 2020-03-03T00:00:00.000Z | withdrawal | 401        | 5428                     |
| 366         | 2020-03-05T00:00:00.000Z | purchase   | 19         | 5409                     |
| 366         | 2020-03-07T00:00:00.000Z | purchase   | 270        | 5139                     |
| 366         | 2020-03-14T00:00:00.000Z | withdrawal | 291        | 5430                     |
| 366         | 2020-03-27T00:00:00.000Z | purchase   | 174        | 5256                     |
| 366         | 2020-03-28T00:00:00.000Z | withdrawal | 57         | 5313                     |
| 366         | 2020-04-03T00:00:00.000Z | deposit    | 209        | 5522                     |
| 367         | 2020-01-29T00:00:00.000Z | deposit    | 239        | 239                      |
| 367         | 2020-02-07T00:00:00.000Z | purchase   | 693        | -454                     |
| 367         | 2020-02-08T00:00:00.000Z | withdrawal | 460        | 6                        |
| 367         | 2020-02-16T00:00:00.000Z | withdrawal | 394        | 995                      |
| 367         | 2020-02-16T00:00:00.000Z | deposit    | 595        | 995                      |
| 367         | 2020-02-17T00:00:00.000Z | deposit    | 581        | 1576                     |
| 367         | 2020-02-24T00:00:00.000Z | purchase   | 335        | 1241                     |
| 367         | 2020-03-03T00:00:00.000Z | withdrawal | 987        | 2228                     |
| 367         | 2020-03-06T00:00:00.000Z | withdrawal | 779        | 3007                     |
| 367         | 2020-03-12T00:00:00.000Z | withdrawal | 784        | 3791                     |
| 367         | 2020-03-17T00:00:00.000Z | withdrawal | 84         | 3875                     |
| 367         | 2020-04-05T00:00:00.000Z | deposit    | 694        | 4569                     |
| 367         | 2020-04-06T00:00:00.000Z | deposit    | 355        | 4924                     |
| 367         | 2020-04-11T00:00:00.000Z | withdrawal | 144        | 5068                     |
| 367         | 2020-04-18T00:00:00.000Z | deposit    | 499        | 5567                     |
| 368         | 2020-01-17T00:00:00.000Z | deposit    | 100        | 100                      |
| 368         | 2020-01-28T00:00:00.000Z | withdrawal | 903        | 1003                     |
| 368         | 2020-01-30T00:00:00.000Z | deposit    | 277        | 1280                     |
| 368         | 2020-02-02T00:00:00.000Z | purchase   | 232        | 1048                     |
| 368         | 2020-02-03T00:00:00.000Z | withdrawal | 510        | 1558                     |
| 368         | 2020-02-06T00:00:00.000Z | deposit    | 450        | 2008                     |
| 368         | 2020-02-07T00:00:00.000Z | withdrawal | 242        | 2250                     |
| 368         | 2020-02-12T00:00:00.000Z | purchase   | 910        | 1340                     |
| 368         | 2020-02-17T00:00:00.000Z | withdrawal | 296        | 1636                     |
| 368         | 2020-02-18T00:00:00.000Z | withdrawal | 626        | 2262                     |
| 368         | 2020-02-21T00:00:00.000Z | withdrawal | 598        | 2860                     |
| 368         | 2020-03-04T00:00:00.000Z | purchase   | 147        | 2713                     |
| 368         | 2020-03-18T00:00:00.000Z | deposit    | 782        | 3495                     |
| 368         | 2020-03-22T00:00:00.000Z | deposit    | 952        | 4447                     |
| 368         | 2020-03-29T00:00:00.000Z | deposit    | 934        | 5381                     |
| 368         | 2020-03-30T00:00:00.000Z | purchase   | 507        | 4874                     |
| 368         | 2020-04-01T00:00:00.000Z | purchase   | 208        | 4666                     |
| 368         | 2020-04-08T00:00:00.000Z | withdrawal | 282        | 4948                     |
| 368         | 2020-04-11T00:00:00.000Z | withdrawal | 387        | 5335                     |
| 368         | 2020-04-14T00:00:00.000Z | purchase   | 507        | 4828                     |
| 369         | 2020-01-25T00:00:00.000Z | deposit    | 376        | 376                      |
| 369         | 2020-01-28T00:00:00.000Z | withdrawal | 110        | 486                      |
| 369         | 2020-03-04T00:00:00.000Z | deposit    | 958        | 1444                     |
| 369         | 2020-03-12T00:00:00.000Z | deposit    | 971        | 2415                     |
| 369         | 2020-03-16T00:00:00.000Z | purchase   | 516        | 1899                     |
| 370         | 2020-01-13T00:00:00.000Z | deposit    | 363        | 363                      |
| 370         | 2020-01-18T00:00:00.000Z | purchase   | 161        | 202                      |
| 370         | 2020-01-20T00:00:00.000Z | withdrawal | 903        | 1677                     |
| 370         | 2020-01-20T00:00:00.000Z | withdrawal | 572        | 1677                     |
| 370         | 2020-01-26T00:00:00.000Z | purchase   | 329        | 1348                     |
| 370         | 2020-01-30T00:00:00.000Z | withdrawal | 693        | 2041                     |
| 370         | 2020-02-08T00:00:00.000Z | purchase   | 928        | 1113                     |
| 370         | 2020-02-09T00:00:00.000Z | deposit    | 452        | 1565                     |
| 370         | 2020-02-16T00:00:00.000Z | deposit    | 582        | 2147                     |
| 370         | 2020-02-18T00:00:00.000Z | deposit    | 393        | 2540                     |
| 370         | 2020-02-26T00:00:00.000Z | deposit    | 161        | 2701                     |
| 370         | 2020-03-13T00:00:00.000Z | deposit    | 175        | 2356                     |
| 370         | 2020-03-13T00:00:00.000Z | purchase   | 520        | 2356                     |
| 370         | 2020-03-23T00:00:00.000Z | deposit    | 669        | 3025                     |
| 370         | 2020-04-06T00:00:00.000Z | deposit    | 597        | 3622                     |
| 370         | 2020-04-09T00:00:00.000Z | purchase   | 782        | 2840                     |
| 371         | 2020-01-21T00:00:00.000Z | deposit    | 528        | 528                      |
| 371         | 2020-01-29T00:00:00.000Z | purchase   | 662        | -134                     |
| 371         | 2020-02-04T00:00:00.000Z | purchase   | 685        | -819                     |
| 371         | 2020-02-05T00:00:00.000Z | deposit    | 238        | -581                     |
| 371         | 2020-02-16T00:00:00.000Z | deposit    | 146        | -435                     |
| 371         | 2020-02-21T00:00:00.000Z | deposit    | 631        | 196                      |
| 371         | 2020-02-25T00:00:00.000Z | withdrawal | 350        | 546                      |
| 371         | 2020-03-05T00:00:00.000Z | withdrawal | 93         | 639                      |
| 371         | 2020-03-06T00:00:00.000Z | withdrawal | 383        | 1022                     |
| 371         | 2020-03-13T00:00:00.000Z | withdrawal | 218        | 1240                     |
| 371         | 2020-03-23T00:00:00.000Z | withdrawal | 40         | 1280                     |
| 371         | 2020-03-28T00:00:00.000Z | deposit    | 883        | 2163                     |
| 371         | 2020-04-10T00:00:00.000Z | purchase   | 755        | 1408                     |
| 371         | 2020-04-11T00:00:00.000Z | purchase   | 483        | 925                      |
| 372         | 2020-01-02T00:00:00.000Z | deposit    | 920        | 920                      |
| 372         | 2020-01-07T00:00:00.000Z | withdrawal | 208        | 1128                     |
| 372         | 2020-01-12T00:00:00.000Z | deposit    | 296        | 1424                     |
| 372         | 2020-01-18T00:00:00.000Z | deposit    | 924        | 2348                     |
| 372         | 2020-01-20T00:00:00.000Z | purchase   | 120        | 2228                     |
| 372         | 2020-01-25T00:00:00.000Z | deposit    | 906        | 3134                     |
| 372         | 2020-02-05T00:00:00.000Z | deposit    | 268        | 3402                     |
| 372         | 2020-02-11T00:00:00.000Z | deposit    | 735        | 4137                     |
| 372         | 2020-02-20T00:00:00.000Z | purchase   | 578        | 3559                     |
| 372         | 2020-02-21T00:00:00.000Z | withdrawal | 949        | 4508                     |
| 372         | 2020-02-24T00:00:00.000Z | withdrawal | 953        | 5461                     |
| 372         | 2020-03-02T00:00:00.000Z | deposit    | 85         | 6208                     |
| 372         | 2020-03-02T00:00:00.000Z | deposit    | 205        | 6208                     |
| 372         | 2020-03-02T00:00:00.000Z | withdrawal | 457        | 6208                     |
| 372         | 2020-03-05T00:00:00.000Z | withdrawal | 462        | 6670                     |
| 372         | 2020-03-10T00:00:00.000Z | purchase   | 802        | 5868                     |
| 372         | 2020-03-15T00:00:00.000Z | purchase   | 44         | 5824                     |
| 372         | 2020-03-25T00:00:00.000Z | purchase   | 402        | 5422                     |
| 372         | 2020-03-26T00:00:00.000Z | purchase   | 897        | 4525                     |
| 372         | 2020-03-27T00:00:00.000Z | withdrawal | 383        | 4908                     |
| 372         | 2020-03-28T00:00:00.000Z | deposit    | 291        | 5199                     |
| 373         | 2020-01-18T00:00:00.000Z | deposit    | 596        | 596                      |
| 373         | 2020-01-21T00:00:00.000Z | purchase   | 103        | 493                      |
| 373         | 2020-02-15T00:00:00.000Z | purchase   | 216        | 277                      |
| 373         | 2020-03-26T00:00:00.000Z | deposit    | 780        | 1057                     |
| 373         | 2020-04-03T00:00:00.000Z | deposit    | 514        | 1571                     |
| 373         | 2020-04-08T00:00:00.000Z | deposit    | 755        | 2326                     |
| 373         | 2020-04-12T00:00:00.000Z | purchase   | 875        | 1451                     |
| 374         | 2020-01-08T00:00:00.000Z | purchase   | 354        | -237                     |
| 374         | 2020-01-08T00:00:00.000Z | deposit    | 117        | -237                     |
| 374         | 2020-01-10T00:00:00.000Z | purchase   | 654        | -891                     |
| 374         | 2020-01-19T00:00:00.000Z | deposit    | 842        | -49                      |
| 374         | 2020-01-23T00:00:00.000Z | deposit    | 398        | 349                      |
| 374         | 2020-01-28T00:00:00.000Z | withdrawal | 806        | 1155                     |
| 374         | 2020-02-18T00:00:00.000Z | withdrawal | 572        | 1825                     |
| 374         | 2020-02-18T00:00:00.000Z | deposit    | 98         | 1825                     |
| 374         | 2020-02-19T00:00:00.000Z | purchase   | 361        | 1464                     |
| 374         | 2020-03-17T00:00:00.000Z | deposit    | 885        | 2349                     |
| 374         | 2020-03-22T00:00:00.000Z | withdrawal | 686        | 3035                     |
| 374         | 2020-03-23T00:00:00.000Z | purchase   | 3          | 3032                     |
| 374         | 2020-03-28T00:00:00.000Z | deposit    | 422        | 3454                     |
| 374         | 2020-03-31T00:00:00.000Z | purchase   | 172        | 3282                     |
| 375         | 2020-01-19T00:00:00.000Z | deposit    | 647        | 647                      |
| 375         | 2020-02-03T00:00:00.000Z | withdrawal | 707        | 2037                     |
| 375         | 2020-02-03T00:00:00.000Z | deposit    | 683        | 2037                     |
| 375         | 2020-02-09T00:00:00.000Z | deposit    | 169        | 2206                     |
| 375         | 2020-02-17T00:00:00.000Z | purchase   | 464        | 1742                     |
| 375         | 2020-03-03T00:00:00.000Z | withdrawal | 798        | 2540                     |
| 375         | 2020-03-28T00:00:00.000Z | deposit    | 30         | 2570                     |
| 375         | 2020-04-11T00:00:00.000Z | withdrawal | 851        | 3421                     |
| 376         | 2020-01-03T00:00:00.000Z | deposit    | 706        | 783                      |
| 376         | 2020-01-03T00:00:00.000Z | withdrawal | 77         | 783                      |
| 376         | 2020-01-09T00:00:00.000Z | purchase   | 554        | 229                      |
| 376         | 2020-01-13T00:00:00.000Z | deposit    | 628        | 857                      |
| 376         | 2020-01-20T00:00:00.000Z | purchase   | 7          | 850                      |
| 376         | 2020-01-21T00:00:00.000Z | deposit    | 518        | 1368                     |
| 376         | 2020-01-31T00:00:00.000Z | deposit    | 400        | 1768                     |
| 376         | 2020-02-06T00:00:00.000Z | withdrawal | 996        | 2764                     |
| 376         | 2020-02-11T00:00:00.000Z | deposit    | 902        | 3666                     |
| 376         | 2020-02-12T00:00:00.000Z | deposit    | 950        | 4616                     |
| 376         | 2020-02-21T00:00:00.000Z | deposit    | 44         | 5552                     |
| 376         | 2020-02-21T00:00:00.000Z | deposit    | 892        | 5552                     |
| 376         | 2020-02-27T00:00:00.000Z | deposit    | 25         | 5577                     |
| 376         | 2020-02-29T00:00:00.000Z | withdrawal | 916        | 6493                     |
| 376         | 2020-03-06T00:00:00.000Z | withdrawal | 381        | 6279                     |
| 376         | 2020-03-06T00:00:00.000Z | purchase   | 595        | 6279                     |
| 376         | 2020-03-12T00:00:00.000Z | withdrawal | 325        | 6978                     |
| 376         | 2020-03-12T00:00:00.000Z | withdrawal | 374        | 6978                     |
| 376         | 2020-03-18T00:00:00.000Z | deposit    | 427        | 7405                     |
| 376         | 2020-03-27T00:00:00.000Z | deposit    | 815        | 8220                     |
| 376         | 2020-03-31T00:00:00.000Z | deposit    | 980        | 9200                     |
| 377         | 2020-01-18T00:00:00.000Z | deposit    | 637        | 637                      |
| 377         | 2020-01-25T00:00:00.000Z | deposit    | 99         | 736                      |
| 377         | 2020-01-30T00:00:00.000Z | withdrawal | 484        | 1220                     |
| 377         | 2020-02-05T00:00:00.000Z | withdrawal | 92         | 1312                     |
| 377         | 2020-02-26T00:00:00.000Z | purchase   | 342        | 970                      |
| 377         | 2020-04-06T00:00:00.000Z | deposit    | 633        | 1603                     |
| 377         | 2020-04-08T00:00:00.000Z | withdrawal | 655        | 2258                     |
| 377         | 2020-04-09T00:00:00.000Z | withdrawal | 581        | 2839                     |
| 378         | 2020-01-07T00:00:00.000Z | deposit    | 193        | 193                      |
| 378         | 2020-01-26T00:00:00.000Z | purchase   | 186        | 7                        |
| 378         | 2020-01-27T00:00:00.000Z | deposit    | 369        | 376                      |
| 378         | 2020-01-30T00:00:00.000Z | deposit    | 108        | 484                      |
| 378         | 2020-02-05T00:00:00.000Z | deposit    | 392        | 876                      |
| 378         | 2020-02-11T00:00:00.000Z | deposit    | 936        | 1812                     |
| 378         | 2020-02-14T00:00:00.000Z | withdrawal | 623        | 2435                     |
| 378         | 2020-02-26T00:00:00.000Z | deposit    | 145        | 3008                     |
| 378         | 2020-02-26T00:00:00.000Z | deposit    | 428        | 3008                     |
| 378         | 2020-02-27T00:00:00.000Z | deposit    | 662        | 3670                     |
| 378         | 2020-03-04T00:00:00.000Z | withdrawal | 497        | 4167                     |
| 378         | 2020-03-12T00:00:00.000Z | purchase   | 690        | 3477                     |
| 378         | 2020-03-21T00:00:00.000Z | deposit    | 353        | 3830                     |
| 379         | 2020-01-12T00:00:00.000Z | deposit    | 451        | -35                      |
| 379         | 2020-01-12T00:00:00.000Z | purchase   | 486        | -35                      |
| 379         | 2020-02-03T00:00:00.000Z | deposit    | 604        | 569                      |
| 379         | 2020-02-10T00:00:00.000Z | withdrawal | 271        | 840                      |
| 379         | 2020-02-18T00:00:00.000Z | withdrawal | 93         | 933                      |
| 379         | 2020-02-25T00:00:00.000Z | purchase   | 473        | 460                      |
| 379         | 2020-04-04T00:00:00.000Z | purchase   | 938        | -478                     |
| 380         | 2020-01-03T00:00:00.000Z | deposit    | 487        | 487                      |
| 380         | 2020-01-12T00:00:00.000Z | purchase   | 433        | 54                       |
| 380         | 2020-01-17T00:00:00.000Z | withdrawal | 431        | 533                      |
| 380         | 2020-01-17T00:00:00.000Z | deposit    | 48         | 533                      |
| 380         | 2020-01-30T00:00:00.000Z | purchase   | 520        | 13                       |
| 380         | 2020-02-12T00:00:00.000Z | withdrawal | 919        | 932                      |
| 380         | 2020-02-16T00:00:00.000Z | deposit    | 833        | 1765                     |
| 380         | 2020-02-17T00:00:00.000Z | deposit    | 230        | 1995                     |
| 380         | 2020-02-28T00:00:00.000Z | purchase   | 758        | 1237                     |
| 380         | 2020-02-29T00:00:00.000Z | withdrawal | 18         | 1255                     |
| 380         | 2020-03-01T00:00:00.000Z | purchase   | 336        | 55                       |
| 380         | 2020-03-01T00:00:00.000Z | purchase   | 864        | 55                       |
| 380         | 2020-03-20T00:00:00.000Z | purchase   | 219        | -245                     |
| 380         | 2020-03-20T00:00:00.000Z | purchase   | 81         | -245                     |
| 380         | 2020-03-26T00:00:00.000Z | deposit    | 77         | -168                     |
| 380         | 2020-03-28T00:00:00.000Z | withdrawal | 758        | 590                      |
| 381         | 2020-01-28T00:00:00.000Z | deposit    | 66         | 66                       |
| 381         | 2020-02-03T00:00:00.000Z | deposit    | 926        | 992                      |
| 381         | 2020-03-02T00:00:00.000Z | purchase   | 985        | 7                        |
| 381         | 2020-03-05T00:00:00.000Z | withdrawal | 186        | 193                      |
| 381         | 2020-03-22T00:00:00.000Z | deposit    | 457        | 650                      |
| 381         | 2020-04-02T00:00:00.000Z | withdrawal | 16         | 666                      |
| 381         | 2020-04-03T00:00:00.000Z | withdrawal | 936        | 1602                     |
| 381         | 2020-04-20T00:00:00.000Z | withdrawal | 367        | 1969                     |
| 381         | 2020-04-26T00:00:00.000Z | deposit    | 444        | 2413                     |
| 382         | 2020-01-03T00:00:00.000Z | deposit    | 140        | -372                     |
| 382         | 2020-01-03T00:00:00.000Z | purchase   | 512        | -372                     |
| 382         | 2020-01-10T00:00:00.000Z | deposit    | 95         | -277                     |
| 382         | 2020-01-22T00:00:00.000Z | withdrawal | 410        | 133                      |
| 382         | 2020-02-11T00:00:00.000Z | purchase   | 59         | 74                       |
| 382         | 2020-02-17T00:00:00.000Z | deposit    | 866        | 940                      |
| 382         | 2020-02-22T00:00:00.000Z | withdrawal | 579        | 1519                     |
| 382         | 2020-02-27T00:00:00.000Z | withdrawal | 736        | 2255                     |
| 382         | 2020-03-01T00:00:00.000Z | purchase   | 374        | 1881                     |
| 382         | 2020-03-07T00:00:00.000Z | withdrawal | 64         | 1945                     |
| 382         | 2020-03-18T00:00:00.000Z | withdrawal | 386        | 2331                     |
| 382         | 2020-03-26T00:00:00.000Z | deposit    | 499        | 2830                     |
| 382         | 2020-03-29T00:00:00.000Z | deposit    | 340        | 3170                     |
| 382         | 2020-03-31T00:00:00.000Z | deposit    | 39         | 3209                     |
| 383         | 2020-01-26T00:00:00.000Z | deposit    | 889        | 889                      |
| 383         | 2020-01-29T00:00:00.000Z | withdrawal | 925        | 1814                     |
| 383         | 2020-02-01T00:00:00.000Z | deposit    | 606        | 2420                     |
| 383         | 2020-02-25T00:00:00.000Z | deposit    | 365        | 2785                     |
| 383         | 2020-03-01T00:00:00.000Z | purchase   | 827        | 1958                     |
| 383         | 2020-03-28T00:00:00.000Z | withdrawal | 725        | 2683                     |
| 383         | 2020-04-03T00:00:00.000Z | deposit    | 239        | 2922                     |
| 383         | 2020-04-16T00:00:00.000Z | deposit    | 944        | 3866                     |
| 383         | 2020-04-19T00:00:00.000Z | deposit    | 907        | 4773                     |
| 383         | 2020-04-23T00:00:00.000Z | withdrawal | 419        | 5192                     |
| 383         | 2020-04-24T00:00:00.000Z | withdrawal | 141        | 5333                     |
| 384         | 2020-01-12T00:00:00.000Z | deposit    | 352        | 352                      |
| 384         | 2020-01-21T00:00:00.000Z | purchase   | 117        | 235                      |
| 384         | 2020-01-30T00:00:00.000Z | purchase   | 245        | -10                      |
| 384         | 2020-02-06T00:00:00.000Z | purchase   | 976        | -986                     |
| 384         | 2020-02-07T00:00:00.000Z | withdrawal | 568        | -418                     |
| 384         | 2020-02-09T00:00:00.000Z | withdrawal | 835        | 417                      |
| 384         | 2020-02-15T00:00:00.000Z | deposit    | 600        | 1017                     |
| 384         | 2020-02-19T00:00:00.000Z | purchase   | 425        | 592                      |
| 384         | 2020-02-26T00:00:00.000Z | deposit    | 635        | 767                      |
| 384         | 2020-02-26T00:00:00.000Z | purchase   | 460        | 767                      |
| 384         | 2020-02-27T00:00:00.000Z | purchase   | 447        | 320                      |
| 384         | 2020-03-01T00:00:00.000Z | deposit    | 654        | 974                      |
| 384         | 2020-03-03T00:00:00.000Z | withdrawal | 363        | 1337                     |
| 384         | 2020-03-14T00:00:00.000Z | purchase   | 981        | 356                      |
| 384         | 2020-03-23T00:00:00.000Z | deposit    | 869        | 1225                     |
| 384         | 2020-03-31T00:00:00.000Z | withdrawal | 220        | 1445                     |
| 385         | 2020-01-15T00:00:00.000Z | deposit    | 585        | 585                      |
| 385         | 2020-01-26T00:00:00.000Z | purchase   | 990        | 107                      |
| 385         | 2020-01-26T00:00:00.000Z | withdrawal | 512        | 107                      |
| 385         | 2020-01-31T00:00:00.000Z | withdrawal | 257        | 364                      |
| 385         | 2020-03-03T00:00:00.000Z | deposit    | 335        | 699                      |
| 385         | 2020-03-11T00:00:00.000Z | purchase   | 855        | -156                     |
| 385         | 2020-03-15T00:00:00.000Z | withdrawal | 916        | 760                      |
| 385         | 2020-03-22T00:00:00.000Z | purchase   | 988        | -228                     |
| 385         | 2020-03-27T00:00:00.000Z | purchase   | 607        | -835                     |
| 385         | 2020-03-30T00:00:00.000Z | purchase   | 488        | -1323                    |
| 385         | 2020-04-03T00:00:00.000Z | withdrawal | 168        | -1155                    |
| 386         | 2020-01-26T00:00:00.000Z | deposit    | 854        | 854                      |
| 386         | 2020-01-27T00:00:00.000Z | deposit    | 254        | 1108                     |
| 386         | 2020-02-02T00:00:00.000Z | purchase   | 239        | 869                      |
| 386         | 2020-02-22T00:00:00.000Z | purchase   | 110        | 759                      |
| 386         | 2020-03-08T00:00:00.000Z | purchase   | 470        | 289                      |
| 386         | 2020-03-18T00:00:00.000Z | deposit    | 489        | 778                      |
| 386         | 2020-03-23T00:00:00.000Z | purchase   | 681        | 97                       |
| 386         | 2020-03-29T00:00:00.000Z | withdrawal | 863        | 960                      |
| 386         | 2020-04-02T00:00:00.000Z | withdrawal | 315        | 1275                     |
| 386         | 2020-04-03T00:00:00.000Z | purchase   | 975        | 300                      |
| 386         | 2020-04-11T00:00:00.000Z | withdrawal | 385        | 685                      |
| 386         | 2020-04-13T00:00:00.000Z | deposit    | 328        | 1013                     |
| 386         | 2020-04-20T00:00:00.000Z | withdrawal | 771        | 1784                     |
| 386         | 2020-04-22T00:00:00.000Z | purchase   | 953        | 831                      |
| 387         | 2020-01-22T00:00:00.000Z | deposit    | 180        | 180                      |
| 387         | 2020-01-29T00:00:00.000Z | deposit    | 889        | 1069                     |
| 387         | 2020-03-07T00:00:00.000Z | deposit    | 761        | 1830                     |
| 387         | 2020-03-16T00:00:00.000Z | deposit    | 721        | 2551                     |
| 387         | 2020-04-01T00:00:00.000Z | deposit    | 808        | 3359                     |
| 387         | 2020-04-12T00:00:00.000Z | purchase   | 688        | 2671                     |
| 387         | 2020-04-13T00:00:00.000Z | withdrawal | 217        | 2888                     |
| 388         | 2020-01-09T00:00:00.000Z | deposit    | 833        | 833                      |
| 388         | 2020-01-11T00:00:00.000Z | deposit    | 860        | 1693                     |
| 388         | 2020-01-21T00:00:00.000Z | deposit    | 550        | 2243                     |
| 388         | 2020-02-04T00:00:00.000Z | withdrawal | 336        | 2579                     |
| 388         | 2020-02-21T00:00:00.000Z | purchase   | 781        | 1798                     |
| 388         | 2020-03-04T00:00:00.000Z | deposit    | 472        | 2270                     |
| 388         | 2020-04-01T00:00:00.000Z | purchase   | 222        | 2048                     |
| 389         | 2020-01-04T00:00:00.000Z | deposit    | 632        | 632                      |
| 389         | 2020-01-09T00:00:00.000Z | withdrawal | 852        | 1484                     |
| 389         | 2020-01-10T00:00:00.000Z | deposit    | 398        | 1882                     |
| 389         | 2020-01-24T00:00:00.000Z | purchase   | 205        | 1677                     |
| 389         | 2020-02-03T00:00:00.000Z | deposit    | 681        | 2358                     |
| 389         | 2020-02-07T00:00:00.000Z | withdrawal | 375        | 2733                     |
| 389         | 2020-02-18T00:00:00.000Z | deposit    | 832        | 3565                     |
| 389         | 2020-02-20T00:00:00.000Z | purchase   | 25         | 3540                     |
| 389         | 2020-02-24T00:00:00.000Z | deposit    | 131        | 3671                     |
| 389         | 2020-02-25T00:00:00.000Z | purchase   | 727        | 2944                     |
| 389         | 2020-03-06T00:00:00.000Z | deposit    | 161        | 3105                     |
| 389         | 2020-03-16T00:00:00.000Z | deposit    | 563        | 3668                     |
| 389         | 2020-04-02T00:00:00.000Z | deposit    | 791        | 4459                     |
| 390         | 2020-01-15T00:00:00.000Z | deposit    | 102        | 102                      |
| 390         | 2020-01-28T00:00:00.000Z | withdrawal | 807        | 909                      |
| 390         | 2020-02-04T00:00:00.000Z | withdrawal | 121        | 1030                     |
| 390         | 2020-02-08T00:00:00.000Z | purchase   | 726        | 304                      |
| 390         | 2020-02-09T00:00:00.000Z | purchase   | 117        | 187                      |
| 390         | 2020-02-21T00:00:00.000Z | withdrawal | 369        | 556                      |
| 390         | 2020-03-09T00:00:00.000Z | purchase   | 713        | -157                     |
| 390         | 2020-03-14T00:00:00.000Z | deposit    | 804        | 647                      |
| 390         | 2020-03-17T00:00:00.000Z | withdrawal | 172        | 819                      |
| 390         | 2020-03-20T00:00:00.000Z | purchase   | 423        | 1009                     |
| 390         | 2020-03-20T00:00:00.000Z | deposit    | 613        | 1009                     |
| 390         | 2020-04-01T00:00:00.000Z | deposit    | 735        | 1744                     |
| 390         | 2020-04-02T00:00:00.000Z | purchase   | 152        | 1592                     |
| 390         | 2020-04-03T00:00:00.000Z | purchase   | 746        | 846                      |
| 390         | 2020-04-07T00:00:00.000Z | purchase   | 709        | 137                      |
| 391         | 2020-01-15T00:00:00.000Z | deposit    | 219        | 219                      |
| 391         | 2020-01-20T00:00:00.000Z | deposit    | 733        | 952                      |
| 391         | 2020-01-25T00:00:00.000Z | purchase   | 349        | 603                      |
| 391         | 2020-02-10T00:00:00.000Z | deposit    | 133        | 736                      |
| 391         | 2020-02-18T00:00:00.000Z | purchase   | 454        | 282                      |
| 391         | 2020-02-26T00:00:00.000Z | purchase   | 280        | 2                        |
| 391         | 2020-03-08T00:00:00.000Z | deposit    | 595        | 597                      |
| 391         | 2020-03-20T00:00:00.000Z | deposit    | 795        | 1392                     |
| 391         | 2020-03-25T00:00:00.000Z | purchase   | 393        | 999                      |
| 391         | 2020-03-29T00:00:00.000Z | purchase   | 727        | 272                      |
| 391         | 2020-04-06T00:00:00.000Z | purchase   | 849        | -577                     |
| 391         | 2020-04-13T00:00:00.000Z | deposit    | 487        | -90                      |
| 392         | 2020-01-29T00:00:00.000Z | deposit    | 876        | 936                      |
| 392         | 2020-01-29T00:00:00.000Z | withdrawal | 60         | 936                      |
| 392         | 2020-02-06T00:00:00.000Z | deposit    | 995        | 1931                     |
| 392         | 2020-02-07T00:00:00.000Z | deposit    | 223        | 2154                     |
| 392         | 2020-03-04T00:00:00.000Z | purchase   | 120        | 2034                     |
| 392         | 2020-03-09T00:00:00.000Z | withdrawal | 416        | 2450                     |
| 392         | 2020-04-01T00:00:00.000Z | withdrawal | 503        | 2953                     |
| 392         | 2020-04-12T00:00:00.000Z | purchase   | 70         | 2883                     |
| 392         | 2020-04-21T00:00:00.000Z | deposit    | 328        | 3211                     |
| 393         | 2020-01-17T00:00:00.000Z | deposit    | 118        | 118                      |
| 393         | 2020-01-30T00:00:00.000Z | deposit    | 541        | 659                      |
| 393         | 2020-02-01T00:00:00.000Z | purchase   | 577        | 82                       |
| 393         | 2020-02-04T00:00:00.000Z | withdrawal | 62         | 144                      |
| 393         | 2020-02-08T00:00:00.000Z | deposit    | 98         | 242                      |
| 393         | 2020-03-01T00:00:00.000Z | deposit    | 720        | 962                      |
| 393         | 2020-03-02T00:00:00.000Z | withdrawal | 310        | 1272                     |
| 393         | 2020-03-05T00:00:00.000Z | deposit    | 867        | 2139                     |
| 393         | 2020-03-17T00:00:00.000Z | withdrawal | 727        | 2866                     |
| 393         | 2020-03-21T00:00:00.000Z | deposit    | 739        | 3605                     |
| 393         | 2020-03-25T00:00:00.000Z | purchase   | 327        | 3278                     |
| 393         | 2020-03-29T00:00:00.000Z | deposit    | 776        | 4410                     |
| 393         | 2020-03-29T00:00:00.000Z | withdrawal | 356        | 4410                     |
| 393         | 2020-04-04T00:00:00.000Z | withdrawal | 68         | 4478                     |
| 393         | 2020-04-05T00:00:00.000Z | purchase   | 317        | 4161                     |
| 393         | 2020-04-10T00:00:00.000Z | purchase   | 476        | 3685                     |
| 394         | 2020-01-04T00:00:00.000Z | deposit    | 908        | 1762                     |
| 394         | 2020-01-04T00:00:00.000Z | deposit    | 854        | 1762                     |
| 394         | 2020-01-07T00:00:00.000Z | deposit    | 255        | 2017                     |
| 394         | 2020-01-11T00:00:00.000Z | purchase   | 218        | 1799                     |
| 394         | 2020-01-14T00:00:00.000Z | withdrawal | 294        | 2093                     |
| 394         | 2020-01-19T00:00:00.000Z | deposit    | 798        | 2891                     |
| 394         | 2020-01-27T00:00:00.000Z | deposit    | 965        | 3856                     |
| 394         | 2020-02-01T00:00:00.000Z | purchase   | 850        | 3006                     |
| 394         | 2020-02-05T00:00:00.000Z | purchase   | 313        | 2693                     |
| 394         | 2020-02-09T00:00:00.000Z | deposit    | 259        | 2952                     |
| 394         | 2020-02-16T00:00:00.000Z | purchase   | 468        | 2484                     |
| 394         | 2020-02-19T00:00:00.000Z | deposit    | 769        | 3253                     |
| 394         | 2020-02-21T00:00:00.000Z | purchase   | 839        | 2414                     |
| 394         | 2020-02-28T00:00:00.000Z | deposit    | 818        | 3232                     |
| 394         | 2020-03-14T00:00:00.000Z | withdrawal | 570        | 3802                     |
| 394         | 2020-03-16T00:00:00.000Z | withdrawal | 654        | 4456                     |
| 395         | 2020-01-14T00:00:00.000Z | deposit    | 40         | 40                       |
| 395         | 2020-01-16T00:00:00.000Z | purchase   | 636        | -596                     |
| 395         | 2020-01-18T00:00:00.000Z | purchase   | 507        | -1103                    |
| 395         | 2020-01-21T00:00:00.000Z | deposit    | 35         | -1068                    |
| 395         | 2020-01-23T00:00:00.000Z | withdrawal | 714        | -354                     |
| 395         | 2020-02-14T00:00:00.000Z | deposit    | 868        | 514                      |
| 395         | 2020-03-02T00:00:00.000Z | deposit    | 548        | 1062                     |
| 395         | 2020-03-04T00:00:00.000Z | deposit    | 396        | 1458                     |
| 395         | 2020-03-23T00:00:00.000Z | purchase   | 583        | 875                      |
| 395         | 2020-03-31T00:00:00.000Z | withdrawal | 350        | 1225                     |
| 395         | 2020-04-09T00:00:00.000Z | purchase   | 820        | 405                      |
| 396         | 2020-01-01T00:00:00.000Z | deposit    | 608        | 942                      |
| 396         | 2020-01-01T00:00:00.000Z | deposit    | 334        | 942                      |
| 396         | 2020-01-02T00:00:00.000Z | withdrawal | 598        | 1540                     |
| 396         | 2020-01-05T00:00:00.000Z | purchase   | 114        | 1426                     |
| 396         | 2020-01-10T00:00:00.000Z | deposit    | 460        | 2764                     |
| 396         | 2020-01-10T00:00:00.000Z | withdrawal | 878        | 2764                     |
| 396         | 2020-01-13T00:00:00.000Z | withdrawal | 201        | 2965                     |
| 396         | 2020-01-18T00:00:00.000Z | purchase   | 520        | 2445                     |
| 396         | 2020-02-01T00:00:00.000Z | withdrawal | 454        | 2899                     |
| 396         | 2020-02-03T00:00:00.000Z | withdrawal | 221        | 3120                     |
| 396         | 2020-02-16T00:00:00.000Z | deposit    | 230        | 3350                     |
| 396         | 2020-02-28T00:00:00.000Z | deposit    | 804        | 4154                     |
| 396         | 2020-03-01T00:00:00.000Z | purchase   | 792        | 3362                     |
| 396         | 2020-03-05T00:00:00.000Z | withdrawal | 586        | 3948                     |
| 396         | 2020-03-11T00:00:00.000Z | purchase   | 403        | 3545                     |
| 396         | 2020-03-15T00:00:00.000Z | purchase   | 680        | 2865                     |
| 396         | 2020-03-19T00:00:00.000Z | deposit    | 245        | 3110                     |
| 396         | 2020-03-23T00:00:00.000Z | purchase   | 82         | 3028                     |
| 397         | 2020-01-06T00:00:00.000Z | deposit    | 973        | 973                      |
| 397         | 2020-02-05T00:00:00.000Z | deposit    | 133        | 1106                     |
| 397         | 2020-03-10T00:00:00.000Z | deposit    | 676        | 1782                     |
| 397         | 2020-03-11T00:00:00.000Z | purchase   | 73         | 1709                     |
| 398         | 2020-01-01T00:00:00.000Z | deposit    | 196        | 196                      |
| 398         | 2020-01-10T00:00:00.000Z | purchase   | 951        | -755                     |
| 398         | 2020-01-14T00:00:00.000Z | withdrawal | 255        | -500                     |
| 398         | 2020-01-16T00:00:00.000Z | withdrawal | 195        | -305                     |
| 398         | 2020-01-23T00:00:00.000Z | deposit    | 523        | 218                      |
| 398         | 2020-01-27T00:00:00.000Z | purchase   | 570        | -352                     |
| 398         | 2020-01-31T00:00:00.000Z | deposit    | 823        | 471                      |
| 398         | 2020-02-02T00:00:00.000Z | purchase   | 38         | 433                      |
| 398         | 2020-02-13T00:00:00.000Z | purchase   | 546        | -113                     |
| 398         | 2020-02-14T00:00:00.000Z | purchase   | 902        | -1015                    |
| 398         | 2020-02-16T00:00:00.000Z | withdrawal | 232        | -783                     |
| 398         | 2020-02-20T00:00:00.000Z | purchase   | 150        | -933                     |
| 398         | 2020-02-27T00:00:00.000Z | purchase   | 874        | -1807                    |
| 398         | 2020-03-09T00:00:00.000Z | deposit    | 873        | -934                     |
| 398         | 2020-03-10T00:00:00.000Z | withdrawal | 678        | -256                     |
| 398         | 2020-03-14T00:00:00.000Z | withdrawal | 817        | 561                      |
| 398         | 2020-03-21T00:00:00.000Z | purchase   | 201        | 360                      |
| 398         | 2020-03-22T00:00:00.000Z | purchase   | 916        | -556                     |
| 398         | 2020-03-24T00:00:00.000Z | deposit    | 874        | 953                      |
| 398         | 2020-03-24T00:00:00.000Z | deposit    | 635        | 953                      |
| 399         | 2020-01-13T00:00:00.000Z | withdrawal | 187        | 967                      |
| 399         | 2020-01-13T00:00:00.000Z | deposit    | 780        | 967                      |
| 399         | 2020-02-06T00:00:00.000Z | purchase   | 999        | -32                      |
| 399         | 2020-02-14T00:00:00.000Z | deposit    | 105        | 73                       |
| 399         | 2020-03-07T00:00:00.000Z | withdrawal | 265        | 338                      |
| 399         | 2020-03-13T00:00:00.000Z | withdrawal | 769        | 1911                     |
| 399         | 2020-03-13T00:00:00.000Z | deposit    | 804        | 1911                     |
| 399         | 2020-03-22T00:00:00.000Z | withdrawal | 957        | 2868                     |
| 399         | 2020-04-01T00:00:00.000Z | withdrawal | 229        | 3097                     |
| 400         | 2020-01-24T00:00:00.000Z | deposit    | 691        | 691                      |
| 400         | 2020-01-26T00:00:00.000Z | withdrawal | 536        | 1227                     |
| 400         | 2020-02-04T00:00:00.000Z | withdrawal | 242        | 1469                     |
| 400         | 2020-02-21T00:00:00.000Z | purchase   | 395        | 1074                     |
| 400         | 2020-02-26T00:00:00.000Z | deposit    | 73         | 1147                     |
| 400         | 2020-04-11T00:00:00.000Z | deposit    | 944        | 2091                     |
| 400         | 2020-04-18T00:00:00.000Z | deposit    | 803        | 2894                     |
| 401         | 2020-01-03T00:00:00.000Z | deposit    | 956        | 956                      |
| 401         | 2020-01-21T00:00:00.000Z | withdrawal | 854        | 1810                     |
| 401         | 2020-02-29T00:00:00.000Z | withdrawal | 127        | 1937                     |
| 401         | 2020-03-07T00:00:00.000Z | purchase   | 855        | 1082                     |
| 401         | 2020-03-20T00:00:00.000Z | deposit    | 963        | 2045                     |
| 402         | 2020-01-05T00:00:00.000Z | deposit    | 435        | 435                      |
| 402         | 2020-01-13T00:00:00.000Z | withdrawal | 127        | 562                      |
| 402         | 2020-01-19T00:00:00.000Z | deposit    | 805        | 1367                     |
| 402         | 2020-01-31T00:00:00.000Z | deposit    | 365        | 1732                     |
| 402         | 2020-02-10T00:00:00.000Z | deposit    | 166        | 1898                     |
| 402         | 2020-02-18T00:00:00.000Z | purchase   | 45         | 1853                     |
| 402         | 2020-03-17T00:00:00.000Z | purchase   | 803        | 1050                     |
| 403         | 2020-01-13T00:00:00.000Z | deposit    | 232        | 232                      |
| 403         | 2020-01-24T00:00:00.000Z | withdrawal | 60         | 292                      |
| 403         | 2020-01-25T00:00:00.000Z | deposit    | 649        | 941                      |
| 403         | 2020-01-30T00:00:00.000Z | withdrawal | 518        | 1459                     |
| 403         | 2020-03-03T00:00:00.000Z | purchase   | 81         | 1378                     |
| 403         | 2020-03-09T00:00:00.000Z | deposit    | 765        | 2143                     |
| 403         | 2020-04-06T00:00:00.000Z | deposit    | 60         | 2203                     |
| 404         | 2020-01-02T00:00:00.000Z | deposit    | 724        | 1360                     |
| 404         | 2020-01-02T00:00:00.000Z | withdrawal | 636        | 1360                     |
| 404         | 2020-01-05T00:00:00.000Z | withdrawal | 42         | 1402                     |
| 404         | 2020-01-07T00:00:00.000Z | withdrawal | 137        | 1539                     |
| 404         | 2020-01-09T00:00:00.000Z | deposit    | 229        | 1768                     |
| 404         | 2020-01-16T00:00:00.000Z | purchase   | 592        | 2109                     |
| 404         | 2020-01-16T00:00:00.000Z | deposit    | 933        | 2109                     |
| 404         | 2020-01-17T00:00:00.000Z | purchase   | 190        | 1919                     |
| 404         | 2020-01-24T00:00:00.000Z | withdrawal | 867        | 2786                     |
| 404         | 2020-01-25T00:00:00.000Z | deposit    | 333        | 3119                     |
| 404         | 2020-02-05T00:00:00.000Z | withdrawal | 44         | 3163                     |
| 404         | 2020-02-06T00:00:00.000Z | deposit    | 329        | 3492                     |
| 404         | 2020-02-12T00:00:00.000Z | deposit    | 981        | 4473                     |
| 404         | 2020-02-14T00:00:00.000Z | purchase   | 515        | 3958                     |
| 404         | 2020-02-27T00:00:00.000Z | purchase   | 853        | 3105                     |
| 404         | 2020-03-08T00:00:00.000Z | deposit    | 41         | 3146                     |
| 404         | 2020-03-11T00:00:00.000Z | withdrawal | 351        | 3497                     |
| 404         | 2020-03-16T00:00:00.000Z | purchase   | 563        | 2934                     |
| 404         | 2020-03-23T00:00:00.000Z | purchase   | 720        | 2214                     |
| 404         | 2020-03-27T00:00:00.000Z | deposit    | 364        | 2578                     |
| 404         | 2020-03-31T00:00:00.000Z | purchase   | 908        | 1670                     |
| 405         | 2020-01-04T00:00:00.000Z | deposit    | 413        | 413                      |
| 405         | 2020-01-12T00:00:00.000Z | withdrawal | 975        | 1388                     |
| 405         | 2020-01-13T00:00:00.000Z | purchase   | 209        | 1179                     |
| 405         | 2020-01-14T00:00:00.000Z | deposit    | 480        | 1659                     |
| 405         | 2020-01-17T00:00:00.000Z | purchase   | 492        | 413                      |
| 405         | 2020-01-17T00:00:00.000Z | purchase   | 754        | 413                      |
| 405         | 2020-01-20T00:00:00.000Z | purchase   | 458        | -45                      |
| 405         | 2020-01-29T00:00:00.000Z | purchase   | 902        | -947                     |
| 405         | 2020-02-01T00:00:00.000Z | purchase   | 593        | -1540                    |
| 405         | 2020-02-07T00:00:00.000Z | purchase   | 438        | -1978                    |
| 405         | 2020-02-19T00:00:00.000Z | withdrawal | 742        | -1236                    |
| 405         | 2020-02-25T00:00:00.000Z | deposit    | 545        | -691                     |
| 405         | 2020-03-07T00:00:00.000Z | deposit    | 702        | 11                       |
| 405         | 2020-03-10T00:00:00.000Z | purchase   | 456        | -445                     |
| 405         | 2020-03-13T00:00:00.000Z | purchase   | 984        | -1429                    |
| 405         | 2020-03-14T00:00:00.000Z | deposit    | 38         | -1391                    |
| 405         | 2020-03-18T00:00:00.000Z | withdrawal | 671        | -720                     |
| 405         | 2020-03-27T00:00:00.000Z | purchase   | 171        | -891                     |
| 405         | 2020-03-30T00:00:00.000Z | withdrawal | 836        | -55                      |
| 405         | 2020-03-31T00:00:00.000Z | withdrawal | 379        | 324                      |
| 405         | 2020-04-02T00:00:00.000Z | purchase   | 188        | 136                      |
| 406         | 2020-01-26T00:00:00.000Z | deposit    | 795        | 795                      |
| 406         | 2020-02-01T00:00:00.000Z | deposit    | 829        | 1624                     |
| 406         | 2020-02-12T00:00:00.000Z | withdrawal | 424        | 2048                     |
| 406         | 2020-02-15T00:00:00.000Z | withdrawal | 69         | 2117                     |
| 406         | 2020-03-02T00:00:00.000Z | deposit    | 177        | 2294                     |
| 406         | 2020-03-03T00:00:00.000Z | deposit    | 337        | 2631                     |
| 406         | 2020-03-04T00:00:00.000Z | deposit    | 51         | 2682                     |
| 406         | 2020-03-09T00:00:00.000Z | deposit    | 385        | 3067                     |
| 406         | 2020-03-12T00:00:00.000Z | withdrawal | 114        | 3181                     |
| 406         | 2020-03-24T00:00:00.000Z | deposit    | 394        | 3575                     |
| 406         | 2020-03-28T00:00:00.000Z | deposit    | 236        | 3811                     |
| 406         | 2020-04-03T00:00:00.000Z | withdrawal | 262        | 4073                     |
| 406         | 2020-04-04T00:00:00.000Z | withdrawal | 606        | 4679                     |
| 406         | 2020-04-06T00:00:00.000Z | deposit    | 892        | 5571                     |
| 406         | 2020-04-10T00:00:00.000Z | withdrawal | 342        | 5913                     |
| 407         | 2020-01-14T00:00:00.000Z | deposit    | 804        | 804                      |
| 407         | 2020-01-23T00:00:00.000Z | withdrawal | 821        | 1625                     |
| 407         | 2020-01-25T00:00:00.000Z | deposit    | 24         | 1649                     |
| 407         | 2020-02-04T00:00:00.000Z | deposit    | 643        | 2292                     |
| 407         | 2020-02-05T00:00:00.000Z | purchase   | 604        | 1688                     |
| 407         | 2020-03-16T00:00:00.000Z | withdrawal | 946        | 2634                     |
| 407         | 2020-04-01T00:00:00.000Z | purchase   | 999        | 1635                     |
| 407         | 2020-04-03T00:00:00.000Z | purchase   | 969        | 666                      |
| 407         | 2020-04-04T00:00:00.000Z | purchase   | 407        | 259                      |
| 408         | 2020-01-21T00:00:00.000Z | deposit    | 514        | 514                      |
| 408         | 2020-01-30T00:00:00.000Z | withdrawal | 659        | 1173                     |
| 408         | 2020-03-09T00:00:00.000Z | deposit    | 945        | 2118                     |
| 408         | 2020-04-14T00:00:00.000Z | purchase   | 932        | 1186                     |
| 409         | 2020-01-22T00:00:00.000Z | deposit    | 155        | 155                      |
| 409         | 2020-02-11T00:00:00.000Z | deposit    | 713        | 868                      |
| 409         | 2020-02-13T00:00:00.000Z | deposit    | 556        | 1424                     |
| 409         | 2020-02-18T00:00:00.000Z | purchase   | 990        | 434                      |
| 409         | 2020-02-24T00:00:00.000Z | deposit    | 937        | 1371                     |
| 409         | 2020-03-01T00:00:00.000Z | deposit    | 983        | 2354                     |
| 409         | 2020-03-18T00:00:00.000Z | withdrawal | 924        | 3278                     |
| 409         | 2020-03-20T00:00:00.000Z | deposit    | 650        | 3928                     |
| 409         | 2020-03-24T00:00:00.000Z | deposit    | 61         | 3989                     |
| 409         | 2020-03-25T00:00:00.000Z | deposit    | 314        | 4303                     |
| 409         | 2020-04-13T00:00:00.000Z | withdrawal | 894        | 5197                     |
| 409         | 2020-04-16T00:00:00.000Z | deposit    | 629        | 5826                     |
| 409         | 2020-04-17T00:00:00.000Z | deposit    | 433        | 6259                     |
| 410         | 2020-01-07T00:00:00.000Z | deposit    | 601        | 601                      |
| 410         | 2020-01-08T00:00:00.000Z | purchase   | 171        | 430                      |
| 410         | 2020-01-21T00:00:00.000Z | deposit    | 595        | 1025                     |
| 410         | 2020-02-07T00:00:00.000Z | purchase   | 103        | 922                      |
| 410         | 2020-02-10T00:00:00.000Z | withdrawal | 723        | 1645                     |
| 410         | 2020-03-04T00:00:00.000Z | deposit    | 136        | 1781                     |
| 410         | 2020-03-09T00:00:00.000Z | withdrawal | 78         | 1859                     |
| 410         | 2020-03-14T00:00:00.000Z | withdrawal | 666        | 2525                     |
| 410         | 2020-03-16T00:00:00.000Z | deposit    | 135        | 2660                     |
| 410         | 2020-03-28T00:00:00.000Z | deposit    | 222        | 2882                     |
| 411         | 2020-01-27T00:00:00.000Z | deposit    | 551        | 551                      |
| 411         | 2020-04-08T00:00:00.000Z | purchase   | 871        | -320                     |
| 411         | 2020-04-23T00:00:00.000Z | purchase   | 661        | -981                     |
| 412         | 2020-01-01T00:00:00.000Z | deposit    | 381        | 381                      |
| 412         | 2020-01-03T00:00:00.000Z | purchase   | 242        | 139                      |
| 412         | 2020-01-06T00:00:00.000Z | deposit    | 583        | 722                      |
| 412         | 2020-02-19T00:00:00.000Z | withdrawal | 114        | 836                      |
| 413         | 2020-01-26T00:00:00.000Z | deposit    | 927        | 927                      |
| 413         | 2020-01-28T00:00:00.000Z | withdrawal | 793        | 2228                     |
| 413         | 2020-01-28T00:00:00.000Z | deposit    | 508        | 2228                     |
| 413         | 2020-02-01T00:00:00.000Z | deposit    | 851        | 3079                     |
| 413         | 2020-02-05T00:00:00.000Z | withdrawal | 389        | 3468                     |
| 413         | 2020-02-10T00:00:00.000Z | deposit    | 223        | 3691                     |
| 413         | 2020-02-16T00:00:00.000Z | withdrawal | 957        | 4648                     |
| 413         | 2020-02-25T00:00:00.000Z | deposit    | 702        | 5350                     |
| 413         | 2020-04-01T00:00:00.000Z | purchase   | 271        | 5079                     |
| 414         | 2020-01-08T00:00:00.000Z | deposit    | 445        | 445                      |
| 414         | 2020-01-21T00:00:00.000Z | withdrawal | 414        | 859                      |
| 414         | 2020-01-22T00:00:00.000Z | deposit    | 711        | 1570                     |
| 414         | 2020-01-28T00:00:00.000Z | withdrawal | 303        | 1873                     |
| 414         | 2020-03-04T00:00:00.000Z | deposit    | 616        | 2489                     |
| 414         | 2020-03-13T00:00:00.000Z | deposit    | 863        | 3352                     |
| 415         | 2020-01-07T00:00:00.000Z | deposit    | 566        | 718                      |
| 415         | 2020-01-07T00:00:00.000Z | deposit    | 152        | 718                      |
| 415         | 2020-01-22T00:00:00.000Z | purchase   | 192        | 526                      |
| 415         | 2020-01-31T00:00:00.000Z | purchase   | 195        | 331                      |
| 415         | 2020-02-13T00:00:00.000Z | purchase   | 67         | 264                      |
| 415         | 2020-02-22T00:00:00.000Z | purchase   | 850        | -586                     |
| 415         | 2020-03-01T00:00:00.000Z | purchase   | 981        | -1567                    |
| 415         | 2020-03-03T00:00:00.000Z | withdrawal | 318        | -1249                    |
| 415         | 2020-03-04T00:00:00.000Z | purchase   | 972        | -2221                    |
| 415         | 2020-03-05T00:00:00.000Z | deposit    | 227        | -1994                    |
| 415         | 2020-03-10T00:00:00.000Z | deposit    | 252        | -1742                    |
| 415         | 2020-03-15T00:00:00.000Z | purchase   | 365        | -2107                    |
| 415         | 2020-03-20T00:00:00.000Z | withdrawal | 947        | -1160                    |
| 415         | 2020-03-22T00:00:00.000Z | withdrawal | 597        | -563                     |
| 416         | 2020-01-16T00:00:00.000Z | deposit    | 756        | 756                      |
| 416         | 2020-02-02T00:00:00.000Z | deposit    | 996        | 1752                     |
| 416         | 2020-02-03T00:00:00.000Z | withdrawal | 806        | 3548                     |
| 416         | 2020-02-03T00:00:00.000Z | withdrawal | 990        | 3548                     |
| 416         | 2020-02-10T00:00:00.000Z | deposit    | 699        | 4247                     |
| 416         | 2020-02-12T00:00:00.000Z | deposit    | 256        | 4503                     |
| 416         | 2020-02-17T00:00:00.000Z | deposit    | 990        | 5493                     |
| 416         | 2020-02-20T00:00:00.000Z | purchase   | 186        | 5307                     |
| 416         | 2020-03-10T00:00:00.000Z | deposit    | 904        | 6211                     |
| 416         | 2020-03-11T00:00:00.000Z | deposit    | 407        | 6618                     |
| 416         | 2020-03-13T00:00:00.000Z | purchase   | 144        | 6474                     |
| 416         | 2020-03-14T00:00:00.000Z | deposit    | 791        | 7265                     |
| 416         | 2020-03-23T00:00:00.000Z | deposit    | 660        | 7925                     |
| 416         | 2020-03-24T00:00:00.000Z | purchase   | 425        | 7500                     |
| 416         | 2020-03-27T00:00:00.000Z | purchase   | 584        | 6916                     |
| 416         | 2020-04-03T00:00:00.000Z | deposit    | 152        | 7068                     |
| 416         | 2020-04-04T00:00:00.000Z | purchase   | 183        | 6885                     |
| 416         | 2020-04-07T00:00:00.000Z | deposit    | 675        | 7560                     |
| 416         | 2020-04-10T00:00:00.000Z | purchase   | 70         | 7490                     |
| 417         | 2020-01-04T00:00:00.000Z | deposit    | 213        | 213                      |
| 417         | 2020-01-05T00:00:00.000Z | deposit    | 977        | 1190                     |
| 417         | 2020-01-08T00:00:00.000Z | deposit    | 832        | 2022                     |
| 417         | 2020-01-17T00:00:00.000Z | purchase   | 343        | 1679                     |
| 417         | 2020-01-22T00:00:00.000Z | purchase   | 972        | 707                      |
| 417         | 2020-02-05T00:00:00.000Z | deposit    | 792        | 1499                     |
| 417         | 2020-02-06T00:00:00.000Z | purchase   | 453        | 130                      |
| 417         | 2020-02-06T00:00:00.000Z | purchase   | 916        | 130                      |
| 417         | 2020-02-20T00:00:00.000Z | purchase   | 220        | -90                      |
| 417         | 2020-02-21T00:00:00.000Z | withdrawal | 320        | 230                      |
| 417         | 2020-02-24T00:00:00.000Z | purchase   | 472        | -242                     |
| 417         | 2020-02-29T00:00:00.000Z | purchase   | 197        | -439                     |
| 417         | 2020-03-04T00:00:00.000Z | purchase   | 620        | -1059                    |
| 417         | 2020-03-30T00:00:00.000Z | deposit    | 159        | -900                     |
| 417         | 2020-04-01T00:00:00.000Z | purchase   | 307        | -1207                    |
| 418         | 2020-01-07T00:00:00.000Z | deposit    | 688        | 688                      |
| 418         | 2020-01-11T00:00:00.000Z | purchase   | 427        | 261                      |
| 418         | 2020-01-14T00:00:00.000Z | deposit    | 205        | 466                      |
| 418         | 2020-01-21T00:00:00.000Z | deposit    | 390        | 856                      |
| 418         | 2020-01-28T00:00:00.000Z | withdrawal | 285        | 1141                     |
| 418         | 2020-01-30T00:00:00.000Z | withdrawal | 732        | 1873                     |
| 418         | 2020-01-31T00:00:00.000Z | withdrawal | 338        | 2211                     |
| 418         | 2020-02-06T00:00:00.000Z | purchase   | 739        | 1472                     |
| 418         | 2020-02-11T00:00:00.000Z | purchase   | 586        | 886                      |
| 418         | 2020-02-16T00:00:00.000Z | deposit    | 730        | 1616                     |
| 418         | 2020-02-18T00:00:00.000Z | withdrawal | 936        | 3119                     |
| 418         | 2020-02-18T00:00:00.000Z | deposit    | 567        | 3119                     |
| 418         | 2020-02-21T00:00:00.000Z | deposit    | 824        | 3943                     |
| 418         | 2020-02-25T00:00:00.000Z | withdrawal | 357        | 4300                     |
| 418         | 2020-03-03T00:00:00.000Z | deposit    | 473        | 4773                     |
| 418         | 2020-03-12T00:00:00.000Z | withdrawal | 289        | 5062                     |
| 418         | 2020-03-13T00:00:00.000Z | purchase   | 812        | 4250                     |
| 418         | 2020-04-02T00:00:00.000Z | deposit    | 386        | 4636                     |
| 418         | 2020-04-05T00:00:00.000Z | purchase   | 590        | 4046                     |
| 419         | 2020-01-11T00:00:00.000Z | deposit    | 711        | 711                      |
| 419         | 2020-01-12T00:00:00.000Z | withdrawal | 217        | 928                      |
| 419         | 2020-01-18T00:00:00.000Z | deposit    | 699        | 1627                     |
| 419         | 2020-02-09T00:00:00.000Z | purchase   | 779        | 848                      |
| 419         | 2020-02-11T00:00:00.000Z | purchase   | 755        | 93                       |
| 419         | 2020-02-23T00:00:00.000Z | deposit    | 159        | 252                      |
| 419         | 2020-02-28T00:00:00.000Z | deposit    | 305        | 557                      |
| 419         | 2020-03-13T00:00:00.000Z | purchase   | 523        | 34                       |
| 419         | 2020-03-20T00:00:00.000Z | purchase   | 84         | -50                      |
| 419         | 2020-03-24T00:00:00.000Z | purchase   | 796        | -846                     |
| 420         | 2020-01-24T00:00:00.000Z | purchase   | 431        | -280                     |
| 420         | 2020-01-24T00:00:00.000Z | deposit    | 151        | -280                     |
| 420         | 2020-02-10T00:00:00.000Z | purchase   | 430        | -710                     |
| 420         | 2020-02-14T00:00:00.000Z | purchase   | 278        | -988                     |
| 420         | 2020-02-21T00:00:00.000Z | purchase   | 796        | -1784                    |
| 420         | 2020-02-23T00:00:00.000Z | withdrawal | 361        | -1423                    |
| 420         | 2020-02-28T00:00:00.000Z | deposit    | 28         | -1395                    |
| 420         | 2020-03-05T00:00:00.000Z | deposit    | 406        | -989                     |
| 420         | 2020-03-06T00:00:00.000Z | withdrawal | 500        | -489                     |
| 420         | 2020-03-07T00:00:00.000Z | withdrawal | 103        | -386                     |
| 420         | 2020-03-24T00:00:00.000Z | purchase   | 143        | -529                     |
| 420         | 2020-04-09T00:00:00.000Z | purchase   | 435        | -964                     |
| 420         | 2020-04-12T00:00:00.000Z | deposit    | 641        | -323                     |
| 420         | 2020-04-16T00:00:00.000Z | withdrawal | 313        | -10                      |
| 420         | 2020-04-21T00:00:00.000Z | deposit    | 486        | 476                      |
| 421         | 2020-01-09T00:00:00.000Z | deposit    | 205        | 205                      |
| 421         | 2020-01-28T00:00:00.000Z | purchase   | 946        | -741                     |
| 421         | 2020-02-03T00:00:00.000Z | deposit    | 523        | -218                     |
| 421         | 2020-02-12T00:00:00.000Z | withdrawal | 353        | 135                      |
| 421         | 2020-03-04T00:00:00.000Z | withdrawal | 38         | 173                      |
| 421         | 2020-03-25T00:00:00.000Z | deposit    | 196        | 369                      |
| 421         | 2020-04-04T00:00:00.000Z | purchase   | 175        | 194                      |
| 421         | 2020-04-05T00:00:00.000Z | deposit    | 900        | 1094                     |
| 422         | 2020-01-25T00:00:00.000Z | deposit    | 356        | 356                      |
| 422         | 2020-02-02T00:00:00.000Z | purchase   | 8          | 348                      |
| 422         | 2020-02-04T00:00:00.000Z | purchase   | 947        | -599                     |
| 422         | 2020-02-07T00:00:00.000Z | deposit    | 364        | -235                     |
| 422         | 2020-02-08T00:00:00.000Z | withdrawal | 653        | 1197                     |
| 422         | 2020-02-08T00:00:00.000Z | withdrawal | 779        | 1197                     |
| 422         | 2020-02-13T00:00:00.000Z | purchase   | 465        | 732                      |
| 422         | 2020-02-28T00:00:00.000Z | deposit    | 442        | 1174                     |
| 422         | 2020-02-29T00:00:00.000Z | deposit    | 434        | 1203                     |
| 422         | 2020-02-29T00:00:00.000Z | purchase   | 405        | 1203                     |
| 422         | 2020-03-02T00:00:00.000Z | purchase   | 641        | 1376                     |
| 422         | 2020-03-02T00:00:00.000Z | deposit    | 814        | 1376                     |
| 422         | 2020-03-08T00:00:00.000Z | deposit    | 944        | 2320                     |
| 422         | 2020-03-14T00:00:00.000Z | purchase   | 256        | 2064                     |
| 422         | 2020-03-22T00:00:00.000Z | purchase   | 488        | 1576                     |
| 422         | 2020-03-24T00:00:00.000Z | deposit    | 242        | 1818                     |
| 422         | 2020-04-06T00:00:00.000Z | purchase   | 210        | 1608                     |
| 422         | 2020-04-07T00:00:00.000Z | withdrawal | 878        | 2486                     |
| 422         | 2020-04-11T00:00:00.000Z | purchase   | 787        | 2054                     |
| 422         | 2020-04-11T00:00:00.000Z | deposit    | 355        | 2054                     |
| 422         | 2020-04-20T00:00:00.000Z | purchase   | 791        | 1263                     |
| 423         | 2020-01-18T00:00:00.000Z | deposit    | 164        | 164                      |
| 423         | 2020-01-23T00:00:00.000Z | deposit    | 197        | 361                      |
| 423         | 2020-02-05T00:00:00.000Z | purchase   | 767        | -406                     |
| 423         | 2020-02-26T00:00:00.000Z | deposit    | 144        | -262                     |
| 423         | 2020-03-01T00:00:00.000Z | purchase   | 374        | -636                     |
| 423         | 2020-03-03T00:00:00.000Z | deposit    | 983        | 347                      |
| 423         | 2020-03-05T00:00:00.000Z | deposit    | 974        | 1321                     |
| 424         | 2020-01-12T00:00:00.000Z | deposit    | 995        | 995                      |
| 424         | 2020-01-14T00:00:00.000Z | purchase   | 371        | 624                      |
| 424         | 2020-01-18T00:00:00.000Z | purchase   | 932        | -308                     |
| 424         | 2020-01-30T00:00:00.000Z | purchase   | 287        | -595                     |
| 424         | 2020-02-04T00:00:00.000Z | deposit    | 836        | 241                      |
| 424         | 2020-02-12T00:00:00.000Z | withdrawal | 580        | 821                      |
| 424         | 2020-02-14T00:00:00.000Z | deposit    | 591        | 1412                     |
| 424         | 2020-02-16T00:00:00.000Z | deposit    | 702        | 2114                     |
| 424         | 2020-02-18T00:00:00.000Z | purchase   | 323        | 1480                     |
| 424         | 2020-02-18T00:00:00.000Z | purchase   | 311        | 1480                     |
| 424         | 2020-02-24T00:00:00.000Z | withdrawal | 264        | 1744                     |
| 424         | 2020-02-25T00:00:00.000Z | purchase   | 903        | 841                      |
| 424         | 2020-02-28T00:00:00.000Z | purchase   | 733        | 108                      |
| 424         | 2020-02-29T00:00:00.000Z | deposit    | 932        | 1040                     |
| 424         | 2020-03-05T00:00:00.000Z | purchase   | 250        | 790                      |
| 424         | 2020-03-09T00:00:00.000Z | deposit    | 761        | 1551                     |
| 424         | 2020-03-15T00:00:00.000Z | withdrawal | 800        | 2351                     |
| 424         | 2020-03-22T00:00:00.000Z | deposit    | 788        | 3139                     |
| 424         | 2020-03-25T00:00:00.000Z | purchase   | 791        | 2348                     |
| 424         | 2020-04-05T00:00:00.000Z | deposit    | 626        | 2974                     |
| 425         | 2020-01-09T00:00:00.000Z | deposit    | 308        | 308                      |
| 425         | 2020-01-15T00:00:00.000Z | purchase   | 245        | 63                       |
| 425         | 2020-02-14T00:00:00.000Z | deposit    | 708        | 771                      |
| 425         | 2020-02-16T00:00:00.000Z | purchase   | 483        | 288                      |
| 425         | 2020-02-18T00:00:00.000Z | deposit    | 55         | 343                      |
| 425         | 2020-02-20T00:00:00.000Z | withdrawal | 483        | 826                      |
| 425         | 2020-02-21T00:00:00.000Z | purchase   | 102        | 974                      |
| 425         | 2020-02-21T00:00:00.000Z | deposit    | 250        | 974                      |
| 425         | 2020-02-29T00:00:00.000Z | purchase   | 513        | 461                      |
| 425         | 2020-03-04T00:00:00.000Z | deposit    | 275        | 736                      |
| 425         | 2020-03-08T00:00:00.000Z | deposit    | 287        | 1023                     |
| 425         | 2020-04-04T00:00:00.000Z | withdrawal | 347        | 1370                     |
| 425         | 2020-04-07T00:00:00.000Z | purchase   | 431        | 939                      |
| 426         | 2020-01-15T00:00:00.000Z | deposit    | 282        | 282                      |
| 426         | 2020-01-22T00:00:00.000Z | purchase   | 984        | -702                     |
| 426         | 2020-01-27T00:00:00.000Z | purchase   | 408        | -1110                    |
| 426         | 2020-01-30T00:00:00.000Z | deposit    | 230        | -880                     |
| 426         | 2020-02-01T00:00:00.000Z | purchase   | 861        | -1741                    |
| 426         | 2020-02-03T00:00:00.000Z | purchase   | 860        | -2601                    |
| 426         | 2020-02-14T00:00:00.000Z | deposit    | 7          | -2594                    |
| 426         | 2020-02-26T00:00:00.000Z | purchase   | 462        | -3056                    |
| 426         | 2020-02-29T00:00:00.000Z | withdrawal | 746        | -2310                    |
| 426         | 2020-03-06T00:00:00.000Z | purchase   | 532        | -2842                    |
| 426         | 2020-03-10T00:00:00.000Z | withdrawal | 229        | -2613                    |
| 426         | 2020-03-21T00:00:00.000Z | withdrawal | 59         | -2554                    |
| 426         | 2020-03-30T00:00:00.000Z | deposit    | 270        | -2284                    |
| 426         | 2020-04-05T00:00:00.000Z | purchase   | 122        | -2406                    |
| 426         | 2020-04-08T00:00:00.000Z | purchase   | 325        | -2731                    |
| 426         | 2020-04-10T00:00:00.000Z | withdrawal | 310        | -2421                    |
| 426         | 2020-04-11T00:00:00.000Z | withdrawal | 243        | -2178                    |
| 427         | 2020-01-22T00:00:00.000Z | deposit    | 588        | 588                      |
| 427         | 2020-02-07T00:00:00.000Z | deposit    | 516        | 1104                     |
| 427         | 2020-02-15T00:00:00.000Z | deposit    | 492        | 1596                     |
| 427         | 2020-02-19T00:00:00.000Z | deposit    | 420        | 2016                     |
| 427         | 2020-02-23T00:00:00.000Z | withdrawal | 711        | 2727                     |
| 427         | 2020-03-01T00:00:00.000Z | purchase   | 670        | 2057                     |
| 427         | 2020-03-23T00:00:00.000Z | withdrawal | 580        | 2637                     |
| 427         | 2020-03-27T00:00:00.000Z | deposit    | 621        | 3258                     |
| 427         | 2020-04-08T00:00:00.000Z | deposit    | 667        | 3925                     |
| 427         | 2020-04-11T00:00:00.000Z | withdrawal | 623        | 4548                     |
| 427         | 2020-04-13T00:00:00.000Z | purchase   | 993        | 3555                     |
| 427         | 2020-04-18T00:00:00.000Z | purchase   | 43         | 3512                     |
| 428         | 2020-01-15T00:00:00.000Z | deposit    | 280        | 280                      |
| 428         | 2020-02-04T00:00:00.000Z | purchase   | 364        | -84                      |
| 428         | 2020-02-06T00:00:00.000Z | purchase   | 176        | -260                     |
| 428         | 2020-02-15T00:00:00.000Z | deposit    | 599        | 339                      |
| 428         | 2020-02-27T00:00:00.000Z | deposit    | 348        | 687                      |
| 428         | 2020-03-03T00:00:00.000Z | deposit    | 530        | 1217                     |
| 429         | 2020-01-21T00:00:00.000Z | deposit    | 82         | 82                       |
| 429         | 2020-02-14T00:00:00.000Z | purchase   | 128        | -46                      |
| 429         | 2020-02-19T00:00:00.000Z | deposit    | 831        | 785                      |
| 429         | 2020-02-25T00:00:00.000Z | purchase   | 312        | 473                      |
| 429         | 2020-03-02T00:00:00.000Z | deposit    | 256        | 1176                     |
| 429         | 2020-03-02T00:00:00.000Z | withdrawal | 611        | 1176                     |
| 429         | 2020-03-02T00:00:00.000Z | purchase   | 164        | 1176                     |
| 429         | 2020-04-04T00:00:00.000Z | withdrawal | 855        | 2031                     |
| 430         | 2020-01-20T00:00:00.000Z | deposit    | 829        | 829                      |
| 430         | 2020-01-25T00:00:00.000Z | withdrawal | 449        | 1278                     |
| 430         | 2020-01-29T00:00:00.000Z | withdrawal | 388        | 1666                     |
| 430         | 2020-02-26T00:00:00.000Z | purchase   | 332        | 1334                     |
| 430         | 2020-02-29T00:00:00.000Z | deposit    | 743        | 2077                     |
| 430         | 2020-03-09T00:00:00.000Z | withdrawal | 968        | 3045                     |
| 430         | 2020-03-23T00:00:00.000Z | purchase   | 761        | 2284                     |
| 431         | 2020-01-11T00:00:00.000Z | deposit    | 101        | 101                      |
| 431         | 2020-01-18T00:00:00.000Z | deposit    | 158        | 259                      |
| 431         | 2020-01-20T00:00:00.000Z | purchase   | 659        | -400                     |
| 431         | 2020-02-20T00:00:00.000Z | purchase   | 739        | -1139                    |
| 432         | 2020-01-26T00:00:00.000Z | purchase   | 817        | -180                     |
| 432         | 2020-01-26T00:00:00.000Z | deposit    | 637        | -180                     |
| 432         | 2020-01-27T00:00:00.000Z | deposit    | 572        | 392                      |
| 432         | 2020-02-08T00:00:00.000Z | deposit    | 772        | 1922                     |
| 432         | 2020-02-08T00:00:00.000Z | withdrawal | 758        | 1922                     |
| 432         | 2020-02-10T00:00:00.000Z | withdrawal | 836        | 2758                     |
| 432         | 2020-02-12T00:00:00.000Z | purchase   | 46         | 2712                     |
| 432         | 2020-02-14T00:00:00.000Z | deposit    | 984        | 3696                     |
| 432         | 2020-02-25T00:00:00.000Z | deposit    | 478        | 4174                     |
| 432         | 2020-03-15T00:00:00.000Z | deposit    | 907        | 5081                     |
| 432         | 2020-03-31T00:00:00.000Z | purchase   | 930        | 4151                     |
| 432         | 2020-04-01T00:00:00.000Z | deposit    | 177        | 5495                     |
| 432         | 2020-04-01T00:00:00.000Z | deposit    | 509        | 5495                     |
| 432         | 2020-04-01T00:00:00.000Z | deposit    | 658        | 5495                     |
| 432         | 2020-04-03T00:00:00.000Z | deposit    | 337        | 5870                     |
| 432         | 2020-04-03T00:00:00.000Z | deposit    | 38         | 5870                     |
| 432         | 2020-04-12T00:00:00.000Z | purchase   | 565        | 5305                     |
| 432         | 2020-04-20T00:00:00.000Z | deposit    | 318        | 5623                     |
| 433         | 2020-01-15T00:00:00.000Z | deposit    | 142        | 142                      |
| 433         | 2020-01-27T00:00:00.000Z | deposit    | 287        | 429                      |
| 433         | 2020-01-29T00:00:00.000Z | deposit    | 454        | 883                      |
| 433         | 2020-02-02T00:00:00.000Z | deposit    | 633        | 1516                     |
| 433         | 2020-02-14T00:00:00.000Z | purchase   | 325        | 1191                     |
| 433         | 2020-02-28T00:00:00.000Z | deposit    | 95         | 1286                     |
| 433         | 2020-03-24T00:00:00.000Z | withdrawal | 626        | 1912                     |
| 434         | 2020-01-14T00:00:00.000Z | deposit    | 686        | 686                      |
| 434         | 2020-01-16T00:00:00.000Z | deposit    | 316        | 1002                     |
| 434         | 2020-01-29T00:00:00.000Z | withdrawal | 775        | 1777                     |
| 434         | 2020-01-31T00:00:00.000Z | deposit    | 896        | 2673                     |
| 434         | 2020-02-08T00:00:00.000Z | purchase   | 781        | 1892                     |
| 434         | 2020-02-12T00:00:00.000Z | withdrawal | 191        | 2083                     |
| 434         | 2020-02-17T00:00:00.000Z | purchase   | 734        | 1349                     |
| 434         | 2020-02-18T00:00:00.000Z | deposit    | 906        | 2255                     |
| 434         | 2020-02-27T00:00:00.000Z | purchase   | 440        | 1815                     |
| 434         | 2020-03-06T00:00:00.000Z | deposit    | 792        | 3044                     |
| 434         | 2020-03-06T00:00:00.000Z | withdrawal | 437        | 3044                     |
| 434         | 2020-03-10T00:00:00.000Z | withdrawal | 758        | 3802                     |
| 434         | 2020-03-15T00:00:00.000Z | purchase   | 620        | 3182                     |
| 434         | 2020-03-17T00:00:00.000Z | purchase   | 509        | 2673                     |
| 434         | 2020-03-18T00:00:00.000Z | withdrawal | 539        | 3212                     |
| 434         | 2020-03-21T00:00:00.000Z | purchase   | 466        | 2746                     |
| 434         | 2020-03-25T00:00:00.000Z | deposit    | 288        | 3034                     |
| 434         | 2020-04-02T00:00:00.000Z | purchase   | 141        | 2893                     |
| 434         | 2020-04-07T00:00:00.000Z | deposit    | 692        | 3585                     |
| 435         | 2020-01-01T00:00:00.000Z | deposit    | 627        | 627                      |
| 435         | 2020-01-02T00:00:00.000Z | purchase   | 778        | -151                     |
| 435         | 2020-01-03T00:00:00.000Z | deposit    | 702        | 551                      |
| 435         | 2020-01-05T00:00:00.000Z | withdrawal | 965        | 1634                     |
| 435         | 2020-01-05T00:00:00.000Z | deposit    | 118        | 1634                     |
| 435         | 2020-01-06T00:00:00.000Z | deposit    | 419        | 2053                     |
| 435         | 2020-01-07T00:00:00.000Z | deposit    | 20         | 1530                     |
| 435         | 2020-01-07T00:00:00.000Z | purchase   | 543        | 1530                     |
| 435         | 2020-01-17T00:00:00.000Z | deposit    | 534        | 2064                     |
| 435         | 2020-01-23T00:00:00.000Z | purchase   | 542        | 1522                     |
| 435         | 2020-01-25T00:00:00.000Z | withdrawal | 921        | 2443                     |
| 435         | 2020-02-13T00:00:00.000Z | deposit    | 386        | 2829                     |
| 435         | 2020-02-14T00:00:00.000Z | deposit    | 337        | 3166                     |
| 435         | 2020-02-26T00:00:00.000Z | deposit    | 568        | 3734                     |
| 435         | 2020-03-09T00:00:00.000Z | withdrawal | 382        | 4116                     |
| 435         | 2020-03-11T00:00:00.000Z | withdrawal | 599        | 4715                     |
| 435         | 2020-03-17T00:00:00.000Z | purchase   | 310        | 4405                     |
| 435         | 2020-03-18T00:00:00.000Z | purchase   | 108        | 4297                     |
| 435         | 2020-03-23T00:00:00.000Z | withdrawal | 545        | 4875                     |
| 435         | 2020-03-23T00:00:00.000Z | deposit    | 33         | 4875                     |
| 435         | 2020-03-25T00:00:00.000Z | deposit    | 508        | 5383                     |
| 435         | 2020-03-28T00:00:00.000Z | deposit    | 265        | 5648                     |
| 436         | 2020-01-05T00:00:00.000Z | deposit    | 401        | 401                      |
| 436         | 2020-01-16T00:00:00.000Z | deposit    | 516        | 917                      |
| 436         | 2020-02-05T00:00:00.000Z | purchase   | 31         | 886                      |
| 436         | 2020-03-03T00:00:00.000Z | purchase   | 304        | 582                      |
| 436         | 2020-03-09T00:00:00.000Z | withdrawal | 248        | 830                      |
| 436         | 2020-03-13T00:00:00.000Z | withdrawal | 917        | 1747                     |
| 436         | 2020-03-29T00:00:00.000Z | purchase   | 93         | 1654                     |
| 437         | 2020-01-05T00:00:00.000Z | deposit    | 935        | 1886                     |
| 437         | 2020-01-05T00:00:00.000Z | withdrawal | 951        | 1886                     |
| 437         | 2020-01-17T00:00:00.000Z | withdrawal | 345        | 2231                     |
| 437         | 2020-02-11T00:00:00.000Z | withdrawal | 80         | 1654                     |
| 437         | 2020-02-11T00:00:00.000Z | purchase   | 657        | 1654                     |
| 437         | 2020-02-12T00:00:00.000Z | purchase   | 439        | 1215                     |
| 437         | 2020-03-16T00:00:00.000Z | purchase   | 86         | 1129                     |
| 437         | 2020-03-17T00:00:00.000Z | deposit    | 305        | 1434                     |
| 437         | 2020-04-02T00:00:00.000Z | deposit    | 184        | 1618                     |
| 438         | 2020-01-01T00:00:00.000Z | deposit    | 261        | 261                      |
| 438         | 2020-01-12T00:00:00.000Z | deposit    | 705        | 966                      |
| 438         | 2020-01-13T00:00:00.000Z | withdrawal | 68         | 1034                     |
| 438         | 2020-01-20T00:00:00.000Z | withdrawal | 538        | 1572                     |
| 438         | 2020-01-31T00:00:00.000Z | deposit    | 957        | 2529                     |
| 438         | 2020-02-01T00:00:00.000Z | purchase   | 93         | 2436                     |
| 438         | 2020-02-12T00:00:00.000Z | withdrawal | 159        | 2595                     |
| 438         | 2020-02-13T00:00:00.000Z | deposit    | 890        | 3485                     |
| 438         | 2020-02-26T00:00:00.000Z | deposit    | 858        | 4343                     |
| 438         | 2020-03-07T00:00:00.000Z | deposit    | 273        | 4616                     |
| 438         | 2020-03-08T00:00:00.000Z | withdrawal | 802        | 5418                     |
| 438         | 2020-03-25T00:00:00.000Z | purchase   | 861        | 4557                     |
| 439         | 2020-01-26T00:00:00.000Z | deposit    | 430        | 430                      |
| 439         | 2020-03-04T00:00:00.000Z | withdrawal | 916        | 1346                     |
| 439         | 2020-03-13T00:00:00.000Z | deposit    | 105        | 1451                     |
| 439         | 2020-04-12T00:00:00.000Z | deposit    | 699        | 2150                     |
| 440         | 2020-01-03T00:00:00.000Z | deposit    | 45         | 45                       |
| 440         | 2020-01-04T00:00:00.000Z | withdrawal | 168        | 213                      |
| 440         | 2020-02-18T00:00:00.000Z | deposit    | 269        | 482                      |
| 440         | 2020-03-04T00:00:00.000Z | deposit    | 585        | 1067                     |
| 440         | 2020-03-26T00:00:00.000Z | withdrawal | 241        | 1308                     |
| 441         | 2020-01-12T00:00:00.000Z | deposit    | 418        | 418                      |
| 441         | 2020-01-13T00:00:00.000Z | withdrawal | 207        | 625                      |
| 441         | 2020-01-18T00:00:00.000Z | withdrawal | 540        | 1165                     |
| 441         | 2020-02-03T00:00:00.000Z | deposit    | 177        | 1342                     |
| 441         | 2020-02-05T00:00:00.000Z | deposit    | 919        | 2261                     |
| 441         | 2020-02-06T00:00:00.000Z | deposit    | 363        | 2624                     |
| 441         | 2020-02-17T00:00:00.000Z | withdrawal | 195        | 2819                     |
| 441         | 2020-02-24T00:00:00.000Z | purchase   | 190        | 2629                     |
| 441         | 2020-03-06T00:00:00.000Z | withdrawal | 229        | 2858                     |
| 441         | 2020-03-16T00:00:00.000Z | purchase   | 634        | 2224                     |
| 441         | 2020-03-18T00:00:00.000Z | deposit    | 37         | 2261                     |
| 441         | 2020-03-20T00:00:00.000Z | purchase   | 917        | 1344                     |
| 441         | 2020-03-24T00:00:00.000Z | deposit    | 856        | 2208                     |
| 441         | 2020-03-24T00:00:00.000Z | deposit    | 8          | 2208                     |
| 441         | 2020-03-25T00:00:00.000Z | withdrawal | 535        | 2743                     |
| 441         | 2020-04-02T00:00:00.000Z | purchase   | 8          | 2735                     |
| 441         | 2020-04-04T00:00:00.000Z | deposit    | 392        | 2607                     |
| 441         | 2020-04-04T00:00:00.000Z | purchase   | 520        | 2607                     |
| 441         | 2020-04-08T00:00:00.000Z | withdrawal | 24         | 2631                     |
| 441         | 2020-04-09T00:00:00.000Z | deposit    | 237        | 2868                     |
| 441         | 2020-04-10T00:00:00.000Z | purchase   | 206        | 2662                     |
| 442         | 2020-01-26T00:00:00.000Z | deposit    | 553        | 553                      |
| 442         | 2020-01-27T00:00:00.000Z | purchase   | 881        | -328                     |
| 442         | 2020-01-28T00:00:00.000Z | deposit    | 470        | 142                      |
| 442         | 2020-02-11T00:00:00.000Z | purchase   | 835        | -933                     |
| 442         | 2020-02-11T00:00:00.000Z | purchase   | 240        | -933                     |
| 442         | 2020-02-20T00:00:00.000Z | withdrawal | 156        | -416                     |
| 442         | 2020-02-20T00:00:00.000Z | withdrawal | 361        | -416                     |
| 442         | 2020-02-21T00:00:00.000Z | purchase   | 638        | -1054                    |
| 442         | 2020-02-23T00:00:00.000Z | purchase   | 810        | -1864                    |
| 442         | 2020-03-02T00:00:00.000Z | withdrawal | 728        | -391                     |
| 442         | 2020-03-02T00:00:00.000Z | withdrawal | 745        | -391                     |
| 442         | 2020-03-09T00:00:00.000Z | purchase   | 661        | -1052                    |
| 442         | 2020-03-13T00:00:00.000Z | deposit    | 741        | -311                     |
| 442         | 2020-03-19T00:00:00.000Z | withdrawal | 309        | -2                       |
| 442         | 2020-03-20T00:00:00.000Z | withdrawal | 824        | 822                      |
| 442         | 2020-03-31T00:00:00.000Z | deposit    | 904        | 1726                     |
| 442         | 2020-04-04T00:00:00.000Z | purchase   | 938        | 788                      |
| 442         | 2020-04-06T00:00:00.000Z | purchase   | 385        | 403                      |
| 442         | 2020-04-15T00:00:00.000Z | deposit    | 359        | 762                      |
| 442         | 2020-04-21T00:00:00.000Z | deposit    | 824        | 1586                     |
| 442         | 2020-04-24T00:00:00.000Z | withdrawal | 839        | 2425                     |
| 443         | 2020-01-28T00:00:00.000Z | deposit    | 760        | 760                      |
| 443         | 2020-02-21T00:00:00.000Z | withdrawal | 57         | 817                      |
| 443         | 2020-02-23T00:00:00.000Z | withdrawal | 592        | 1409                     |
| 443         | 2020-02-29T00:00:00.000Z | deposit    | 599        | 2008                     |
| 443         | 2020-03-02T00:00:00.000Z | purchase   | 845        | 1163                     |
| 443         | 2020-03-22T00:00:00.000Z | purchase   | 377        | 786                      |
| 443         | 2020-03-28T00:00:00.000Z | deposit    | 561        | 1347                     |
| 443         | 2020-03-31T00:00:00.000Z | purchase   | 408        | 939                      |
| 443         | 2020-04-04T00:00:00.000Z | deposit    | 348        | 1287                     |
| 444         | 2020-01-10T00:00:00.000Z | deposit    | 669        | 669                      |
| 444         | 2020-01-11T00:00:00.000Z | purchase   | 586        | 83                       |
| 444         | 2020-02-02T00:00:00.000Z | purchase   | 14         | 69                       |
| 444         | 2020-02-09T00:00:00.000Z | withdrawal | 805        | 874                      |
| 444         | 2020-02-10T00:00:00.000Z | withdrawal | 442        | 1316                     |
| 444         | 2020-03-07T00:00:00.000Z | deposit    | 906        | 2222                     |
| 444         | 2020-03-09T00:00:00.000Z | deposit    | 822        | 3044                     |
| 444         | 2020-03-25T00:00:00.000Z | purchase   | 378        | 2666                     |
| 444         | 2020-03-30T00:00:00.000Z | withdrawal | 671        | 3337                     |
| 444         | 2020-04-08T00:00:00.000Z | withdrawal | 321        | 3658                     |
| 445         | 2020-01-25T00:00:00.000Z | deposit    | 832        | 1668                     |
| 445         | 2020-01-25T00:00:00.000Z | deposit    | 836        | 1668                     |
| 445         | 2020-01-26T00:00:00.000Z | purchase   | 635        | 1033                     |
| 445         | 2020-01-29T00:00:00.000Z | deposit    | 331        | 1364                     |
| 445         | 2020-02-06T00:00:00.000Z | deposit    | 471        | 1835                     |
| 445         | 2020-02-07T00:00:00.000Z | purchase   | 982        | 853                      |
| 445         | 2020-02-12T00:00:00.000Z | withdrawal | 374        | 1227                     |
| 445         | 2020-02-17T00:00:00.000Z | deposit    | 415        | 1642                     |
| 445         | 2020-03-05T00:00:00.000Z | withdrawal | 144        | 2214                     |
| 445         | 2020-03-05T00:00:00.000Z | deposit    | 428        | 2214                     |
| 445         | 2020-03-11T00:00:00.000Z | withdrawal | 454        | 2668                     |
| 445         | 2020-04-01T00:00:00.000Z | withdrawal | 395        | 3063                     |
| 445         | 2020-04-06T00:00:00.000Z | purchase   | 303        | 2760                     |
| 445         | 2020-04-17T00:00:00.000Z | deposit    | 663        | 3794                     |
| 445         | 2020-04-17T00:00:00.000Z | withdrawal | 371        | 3794                     |
| 445         | 2020-04-20T00:00:00.000Z | deposit    | 477        | 4271                     |
| 445         | 2020-04-22T00:00:00.000Z | withdrawal | 483        | 4754                     |
| 446         | 2020-01-15T00:00:00.000Z | deposit    | 412        | 412                      |
| 446         | 2020-03-04T00:00:00.000Z | withdrawal | 837        | 1249                     |
| 446         | 2020-03-23T00:00:00.000Z | deposit    | 372        | 1621                     |
| 446         | 2020-04-03T00:00:00.000Z | deposit    | 458        | 2079                     |
| 447         | 2020-01-03T00:00:00.000Z | deposit    | 188        | 188                      |
| 447         | 2020-01-05T00:00:00.000Z | deposit    | 303        | 1252                     |
| 447         | 2020-01-05T00:00:00.000Z | deposit    | 761        | 1252                     |
| 447         | 2020-01-14T00:00:00.000Z | purchase   | 172        | 1080                     |
| 447         | 2020-01-15T00:00:00.000Z | deposit    | 761        | 1841                     |
| 447         | 2020-01-20T00:00:00.000Z | withdrawal | 657        | 2498                     |
| 447         | 2020-01-23T00:00:00.000Z | deposit    | 11         | 2509                     |
| 447         | 2020-02-22T00:00:00.000Z | withdrawal | 758        | 3267                     |
| 447         | 2020-02-28T00:00:00.000Z | withdrawal | 396        | 3663                     |
| 447         | 2020-03-13T00:00:00.000Z | withdrawal | 539        | 4202                     |
| 447         | 2020-03-19T00:00:00.000Z | withdrawal | 816        | 5018                     |
| 447         | 2020-03-24T00:00:00.000Z | deposit    | 24         | 5042                     |
| 448         | 2020-01-30T00:00:00.000Z | deposit    | 759        | 759                      |
| 448         | 2020-01-31T00:00:00.000Z | deposit    | 601        | 1360                     |
| 448         | 2020-02-05T00:00:00.000Z | withdrawal | 948        | 2308                     |
| 448         | 2020-02-07T00:00:00.000Z | purchase   | 737        | 1571                     |
| 448         | 2020-02-12T00:00:00.000Z | deposit    | 566        | 2137                     |
| 448         | 2020-02-22T00:00:00.000Z | withdrawal | 416        | 2553                     |
| 448         | 2020-02-27T00:00:00.000Z | withdrawal | 734        | 3287                     |
| 448         | 2020-03-04T00:00:00.000Z | deposit    | 334        | 3621                     |
| 448         | 2020-03-06T00:00:00.000Z | deposit    | 135        | 3756                     |
| 448         | 2020-03-20T00:00:00.000Z | withdrawal | 497        | 4253                     |
| 448         | 2020-03-25T00:00:00.000Z | purchase   | 882        | 3371                     |
| 448         | 2020-03-29T00:00:00.000Z | withdrawal | 247        | 3642                     |
| 448         | 2020-03-29T00:00:00.000Z | deposit    | 24         | 3642                     |
| 448         | 2020-04-01T00:00:00.000Z | deposit    | 511        | 4153                     |
| 448         | 2020-04-03T00:00:00.000Z | deposit    | 339        | 4668                     |
| 448         | 2020-04-03T00:00:00.000Z | deposit    | 176        | 4668                     |
| 448         | 2020-04-05T00:00:00.000Z | withdrawal | 667        | 5335                     |
| 448         | 2020-04-21T00:00:00.000Z | purchase   | 795        | 5357                     |
| 448         | 2020-04-21T00:00:00.000Z | deposit    | 817        | 5357                     |
| 448         | 2020-04-27T00:00:00.000Z | withdrawal | 34         | 6114                     |
| 448         | 2020-04-27T00:00:00.000Z | withdrawal | 723        | 6114                     |
| 449         | 2020-01-06T00:00:00.000Z | deposit    | 352        | 352                      |
| 449         | 2020-01-07T00:00:00.000Z | withdrawal | 476        | 828                      |
| 449         | 2020-01-13T00:00:00.000Z | purchase   | 753        | 75                       |
| 449         | 2020-01-16T00:00:00.000Z | purchase   | 393        | -318                     |
| 449         | 2020-01-20T00:00:00.000Z | purchase   | 324        | -642                     |
| 449         | 2020-01-23T00:00:00.000Z | withdrawal | 831        | 189                      |
| 449         | 2020-01-30T00:00:00.000Z | withdrawal | 539        | 728                      |
| 449         | 2020-01-31T00:00:00.000Z | withdrawal | 136        | 864                      |
| 449         | 2020-02-05T00:00:00.000Z | purchase   | 493        | 371                      |
| 449         | 2020-02-13T00:00:00.000Z | purchase   | 289        | 874                      |
| 449         | 2020-02-13T00:00:00.000Z | withdrawal | 792        | 874                      |
| 449         | 2020-02-17T00:00:00.000Z | deposit    | 746        | 1620                     |
| 449         | 2020-03-29T00:00:00.000Z | deposit    | 883        | 2503                     |
| 450         | 2020-01-11T00:00:00.000Z | deposit    | 890        | 890                      |
| 450         | 2020-01-12T00:00:00.000Z | withdrawal | 366        | 1256                     |
| 450         | 2020-01-17T00:00:00.000Z | deposit    | 883        | 2139                     |
| 450         | 2020-01-30T00:00:00.000Z | withdrawal | 938        | 3077                     |
| 450         | 2020-02-16T00:00:00.000Z | purchase   | 628        | 2449                     |
| 450         | 2020-03-03T00:00:00.000Z | withdrawal | 578        | 3027                     |
| 450         | 2020-04-05T00:00:00.000Z | deposit    | 701        | 3728                     |
| 451         | 2020-01-30T00:00:00.000Z | deposit    | 910        | 910                      |
| 451         | 2020-02-06T00:00:00.000Z | purchase   | 853        | 57                       |
| 451         | 2020-02-19T00:00:00.000Z | withdrawal | 563        | 620                      |
| 451         | 2020-02-28T00:00:00.000Z | withdrawal | 807        | 1427                     |
| 451         | 2020-03-13T00:00:00.000Z | deposit    | 668        | 2095                     |
| 451         | 2020-04-06T00:00:00.000Z | withdrawal | 117        | 2212                     |
| 451         | 2020-04-09T00:00:00.000Z | withdrawal | 595        | 2807                     |
| 451         | 2020-04-19T00:00:00.000Z | deposit    | 601        | 3408                     |
| 452         | 2020-01-01T00:00:00.000Z | deposit    | 441        | 441                      |
| 452         | 2020-01-07T00:00:00.000Z | deposit    | 919        | 1360                     |
| 452         | 2020-02-15T00:00:00.000Z | purchase   | 718        | 1507                     |
| 452         | 2020-02-15T00:00:00.000Z | deposit    | 865        | 1507                     |
| 452         | 2020-02-19T00:00:00.000Z | deposit    | 536        | 2043                     |
| 452         | 2020-02-26T00:00:00.000Z | deposit    | 154        | 2197                     |
| 452         | 2020-02-27T00:00:00.000Z | withdrawal | 543        | 2740                     |
| 452         | 2020-03-09T00:00:00.000Z | deposit    | 416        | 3156                     |
| 452         | 2020-03-27T00:00:00.000Z | purchase   | 457        | 2699                     |
| 453         | 2020-01-25T00:00:00.000Z | deposit    | 638        | 638                      |
| 453         | 2020-02-04T00:00:00.000Z | deposit    | 171        | 809                      |
| 453         | 2020-02-16T00:00:00.000Z | purchase   | 765        | 44                       |
| 453         | 2020-02-22T00:00:00.000Z | deposit    | 386        | 430                      |
| 453         | 2020-02-27T00:00:00.000Z | deposit    | 381        | 811                      |
| 453         | 2020-03-01T00:00:00.000Z | withdrawal | 5          | 816                      |
| 453         | 2020-03-14T00:00:00.000Z | purchase   | 652        | 164                      |
| 453         | 2020-03-20T00:00:00.000Z | withdrawal | 134        | 298                      |
| 453         | 2020-03-26T00:00:00.000Z | withdrawal | 615        | 913                      |
| 453         | 2020-04-13T00:00:00.000Z | purchase   | 127        | 786                      |
| 453         | 2020-04-21T00:00:00.000Z | deposit    | 839        | 1625                     |
| 454         | 2020-01-08T00:00:00.000Z | deposit    | 603        | 603                      |
| 454         | 2020-01-16T00:00:00.000Z | deposit    | 409        | 1012                     |
| 454         | 2020-01-28T00:00:00.000Z | purchase   | 120        | 892                      |
| 454         | 2020-01-29T00:00:00.000Z | purchase   | 881        | 11                       |
| 454         | 2020-02-01T00:00:00.000Z | deposit    | 678        | 1311                     |
| 454         | 2020-02-01T00:00:00.000Z | deposit    | 622        | 1311                     |
| 454         | 2020-02-26T00:00:00.000Z | deposit    | 852        | 2163                     |
| 454         | 2020-03-01T00:00:00.000Z | withdrawal | 471        | 2325                     |
| 454         | 2020-03-01T00:00:00.000Z | purchase   | 309        | 2325                     |
| 454         | 2020-03-04T00:00:00.000Z | deposit    | 411        | 2736                     |
| 454         | 2020-03-10T00:00:00.000Z | deposit    | 342        | 3078                     |
| 454         | 2020-03-27T00:00:00.000Z | deposit    | 48         | 3126                     |
| 454         | 2020-03-31T00:00:00.000Z | deposit    | 800        | 3043                     |
| 454         | 2020-03-31T00:00:00.000Z | purchase   | 883        | 3043                     |
| 455         | 2020-01-07T00:00:00.000Z | deposit    | 329        | 329                      |
| 455         | 2020-03-09T00:00:00.000Z | withdrawal | 887        | 1216                     |
| 455         | 2020-03-25T00:00:00.000Z | deposit    | 327        | 1543                     |
| 456         | 2020-01-07T00:00:00.000Z | deposit    | 753        | 753                      |
| 456         | 2020-01-09T00:00:00.000Z | deposit    | 561        | 1314                     |
| 456         | 2020-02-01T00:00:00.000Z | withdrawal | 480        | 1794                     |
| 456         | 2020-02-09T00:00:00.000Z | deposit    | 351        | 2145                     |
| 456         | 2020-02-14T00:00:00.000Z | deposit    | 910        | 3055                     |
| 456         | 2020-02-17T00:00:00.000Z | withdrawal | 537        | 3592                     |
| 456         | 2020-02-20T00:00:00.000Z | deposit    | 622        | 4214                     |
| 456         | 2020-02-21T00:00:00.000Z | withdrawal | 892        | 5106                     |
| 456         | 2020-02-24T00:00:00.000Z | deposit    | 460        | 5566                     |
| 456         | 2020-02-25T00:00:00.000Z | withdrawal | 521        | 6087                     |
| 456         | 2020-02-26T00:00:00.000Z | purchase   | 483        | 5604                     |
| 456         | 2020-03-05T00:00:00.000Z | deposit    | 665        | 6269                     |
| 456         | 2020-03-13T00:00:00.000Z | purchase   | 952        | 5317                     |
| 456         | 2020-03-20T00:00:00.000Z | purchase   | 743        | 4977                     |
| 456         | 2020-03-20T00:00:00.000Z | deposit    | 403        | 4977                     |
| 456         | 2020-03-21T00:00:00.000Z | deposit    | 278        | 5255                     |
| 456         | 2020-03-28T00:00:00.000Z | withdrawal | 450        | 5705                     |
| 456         | 2020-04-03T00:00:00.000Z | deposit    | 270        | 6178                     |
| 456         | 2020-04-03T00:00:00.000Z | withdrawal | 203        | 6178                     |
| 457         | 2020-01-23T00:00:00.000Z | deposit    | 657        | 657                      |
| 457         | 2020-01-24T00:00:00.000Z | withdrawal | 462        | 1119                     |
| 457         | 2020-02-12T00:00:00.000Z | deposit    | 300        | 1419                     |
| 457         | 2020-02-26T00:00:00.000Z | withdrawal | 729        | 2148                     |
| 457         | 2020-03-13T00:00:00.000Z | deposit    | 341        | 2489                     |
| 457         | 2020-03-18T00:00:00.000Z | deposit    | 248        | 2737                     |
| 457         | 2020-03-20T00:00:00.000Z | purchase   | 962        | 1775                     |
| 457         | 2020-03-30T00:00:00.000Z | purchase   | 107        | 1668                     |
| 457         | 2020-04-13T00:00:00.000Z | deposit    | 467        | 2135                     |
| 457         | 2020-04-19T00:00:00.000Z | purchase   | 471        | 1664                     |
| 458         | 2020-01-04T00:00:00.000Z | deposit    | 715        | 715                      |
| 458         | 2020-02-14T00:00:00.000Z | withdrawal | 905        | 1620                     |
| 458         | 2020-02-17T00:00:00.000Z | withdrawal | 463        | 2083                     |
| 459         | 2020-01-13T00:00:00.000Z | deposit    | 857        | 857                      |
| 459         | 2020-01-16T00:00:00.000Z | purchase   | 611        | 246                      |
| 459         | 2020-02-02T00:00:00.000Z | deposit    | 168        | 414                      |
| 459         | 2020-02-13T00:00:00.000Z | withdrawal | 971        | 1385                     |
| 459         | 2020-02-16T00:00:00.000Z | purchase   | 456        | 929                      |
| 459         | 2020-02-17T00:00:00.000Z | purchase   | 585        | 344                      |
| 459         | 2020-02-19T00:00:00.000Z | deposit    | 247        | 591                      |
| 459         | 2020-02-23T00:00:00.000Z | purchase   | 138        | 453                      |
| 459         | 2020-02-24T00:00:00.000Z | purchase   | 543        | -90                      |
| 459         | 2020-02-25T00:00:00.000Z | withdrawal | 880        | 790                      |
| 459         | 2020-03-01T00:00:00.000Z | deposit    | 457        | 1247                     |
| 459         | 2020-03-14T00:00:00.000Z | deposit    | 15         | 1262                     |
| 459         | 2020-03-19T00:00:00.000Z | purchase   | 394        | 868                      |
| 460         | 2020-01-29T00:00:00.000Z | deposit    | 80         | 80                       |
| 460         | 2020-02-14T00:00:00.000Z | deposit    | 552        | 632                      |
| 460         | 2020-02-21T00:00:00.000Z | withdrawal | 966        | 1724                     |
| 460         | 2020-02-21T00:00:00.000Z | deposit    | 126        | 1724                     |
| 460         | 2020-02-25T00:00:00.000Z | withdrawal | 483        | 2207                     |
| 460         | 2020-02-26T00:00:00.000Z | purchase   | 467        | 1740                     |
| 460         | 2020-03-27T00:00:00.000Z | purchase   | 994        | 746                      |
| 460         | 2020-03-28T00:00:00.000Z | deposit    | 977        | 1723                     |
| 460         | 2020-04-02T00:00:00.000Z | deposit    | 848        | 2571                     |
| 461         | 2020-01-01T00:00:00.000Z | deposit    | 840        | 1628                     |
| 461         | 2020-01-01T00:00:00.000Z | deposit    | 788        | 1628                     |
| 461         | 2020-01-10T00:00:00.000Z | deposit    | 752        | 2380                     |
| 461         | 2020-01-18T00:00:00.000Z | deposit    | 386        | 2924                     |
| 461         | 2020-01-18T00:00:00.000Z | withdrawal | 158        | 2924                     |
| 461         | 2020-01-19T00:00:00.000Z | deposit    | 400        | 3324                     |
| 461         | 2020-01-21T00:00:00.000Z | purchase   | 736        | 2593                     |
| 461         | 2020-01-21T00:00:00.000Z | withdrawal | 5          | 2593                     |
| 461         | 2020-02-05T00:00:00.000Z | deposit    | 901        | 3494                     |
| 461         | 2020-02-06T00:00:00.000Z | withdrawal | 508        | 4002                     |
| 461         | 2020-02-09T00:00:00.000Z | deposit    | 771        | 4773                     |
| 461         | 2020-03-04T00:00:00.000Z | purchase   | 219        | 4554                     |
| 462         | 2020-01-26T00:00:00.000Z | withdrawal | 106        | 720                      |
| 462         | 2020-01-26T00:00:00.000Z | deposit    | 614        | 720                      |
| 462         | 2020-01-27T00:00:00.000Z | withdrawal | 106        | 826                      |
| 462         | 2020-01-30T00:00:00.000Z | deposit    | 505        | 1331                     |
| 462         | 2020-02-05T00:00:00.000Z | deposit    | 641        | 1972                     |
| 462         | 2020-02-06T00:00:00.000Z | withdrawal | 77         | 2049                     |
| 462         | 2020-02-07T00:00:00.000Z | purchase   | 912        | 1137                     |
| 462         | 2020-02-08T00:00:00.000Z | deposit    | 249        | 1386                     |
| 462         | 2020-02-14T00:00:00.000Z | withdrawal | 239        | 1625                     |
| 462         | 2020-02-15T00:00:00.000Z | withdrawal | 579        | 2204                     |
| 462         | 2020-03-02T00:00:00.000Z | purchase   | 386        | 2177                     |
| 462         | 2020-03-02T00:00:00.000Z | withdrawal | 359        | 2177                     |
| 462         | 2020-03-03T00:00:00.000Z | deposit    | 144        | 3034                     |
| 462         | 2020-03-03T00:00:00.000Z | withdrawal | 713        | 3034                     |
| 462         | 2020-03-19T00:00:00.000Z | deposit    | 610        | 3644                     |
| 462         | 2020-03-27T00:00:00.000Z | withdrawal | 117        | 3761                     |
| 462         | 2020-04-01T00:00:00.000Z | purchase   | 200        | 3561                     |
| 462         | 2020-04-10T00:00:00.000Z | withdrawal | 510        | 4071                     |
| 462         | 2020-04-13T00:00:00.000Z | withdrawal | 994        | 5065                     |
| 462         | 2020-04-18T00:00:00.000Z | deposit    | 801        | 6205                     |
| 462         | 2020-04-18T00:00:00.000Z | deposit    | 339        | 6205                     |
| 463         | 2020-01-21T00:00:00.000Z | deposit    | 881        | 881                      |
| 463         | 2020-01-27T00:00:00.000Z | deposit    | 285        | 1166                     |
| 463         | 2020-02-02T00:00:00.000Z | purchase   | 760        | 406                      |
| 463         | 2020-02-13T00:00:00.000Z | deposit    | 81         | 487                      |
| 463         | 2020-02-16T00:00:00.000Z | withdrawal | 835        | 1322                     |
| 463         | 2020-02-25T00:00:00.000Z | deposit    | 660        | 1982                     |
| 463         | 2020-03-07T00:00:00.000Z | deposit    | 822        | 2804                     |
| 463         | 2020-03-08T00:00:00.000Z | withdrawal | 542        | 4077                     |
| 463         | 2020-03-08T00:00:00.000Z | withdrawal | 731        | 4077                     |
| 463         | 2020-03-10T00:00:00.000Z | deposit    | 444        | 4521                     |
| 463         | 2020-03-17T00:00:00.000Z | deposit    | 102        | 4623                     |
| 463         | 2020-03-30T00:00:00.000Z | deposit    | 266        | 4889                     |
| 463         | 2020-04-16T00:00:00.000Z | purchase   | 393        | 4496                     |
| 464         | 2020-01-17T00:00:00.000Z | deposit    | 953        | 953                      |
| 464         | 2020-03-24T00:00:00.000Z | purchase   | 609        | 344                      |
| 464         | 2020-03-27T00:00:00.000Z | withdrawal | 855        | 1199                     |
| 464         | 2020-04-11T00:00:00.000Z | purchase   | 983        | 216                      |
| 465         | 2020-01-28T00:00:00.000Z | deposit    | 955        | 955                      |
| 465         | 2020-02-01T00:00:00.000Z | withdrawal | 766        | 1721                     |
| 465         | 2020-02-11T00:00:00.000Z | deposit    | 775        | 2496                     |
| 465         | 2020-02-18T00:00:00.000Z | withdrawal | 34         | 2530                     |
| 465         | 2020-02-22T00:00:00.000Z | deposit    | 238        | 2768                     |
| 465         | 2020-02-26T00:00:00.000Z | deposit    | 821        | 3589                     |
| 465         | 2020-03-25T00:00:00.000Z | purchase   | 483        | 3106                     |
| 465         | 2020-04-06T00:00:00.000Z | purchase   | 156        | 2950                     |
| 466         | 2020-01-17T00:00:00.000Z | deposit    | 80         | 80                       |
| 466         | 2020-02-11T00:00:00.000Z | deposit    | 143        | 223                      |
| 466         | 2020-02-15T00:00:00.000Z | purchase   | 991        | -768                     |
| 466         | 2020-02-17T00:00:00.000Z | withdrawal | 288        | -480                     |
| 466         | 2020-02-27T00:00:00.000Z | withdrawal | 923        | 443                      |
| 466         | 2020-03-17T00:00:00.000Z | deposit    | 63         | 506                      |
| 466         | 2020-03-19T00:00:00.000Z | withdrawal | 197        | 703                      |
| 467         | 2020-01-19T00:00:00.000Z | deposit    | 738        | 738                      |
| 467         | 2020-01-20T00:00:00.000Z | deposit    | 786        | 1956                     |
| 467         | 2020-01-20T00:00:00.000Z | deposit    | 432        | 1956                     |
| 467         | 2020-01-24T00:00:00.000Z | deposit    | 314        | 2270                     |
| 467         | 2020-01-29T00:00:00.000Z | purchase   | 514        | 1994                     |
| 467         | 2020-01-29T00:00:00.000Z | deposit    | 238        | 1994                     |
| 467         | 2020-02-07T00:00:00.000Z | deposit    | 1          | 1995                     |
| 467         | 2020-02-14T00:00:00.000Z | deposit    | 968        | 2963                     |
| 467         | 2020-02-16T00:00:00.000Z | deposit    | 556        | 3519                     |
| 467         | 2020-02-19T00:00:00.000Z | deposit    | 819        | 4338                     |
| 467         | 2020-02-21T00:00:00.000Z | withdrawal | 173        | 4511                     |
| 467         | 2020-02-22T00:00:00.000Z | withdrawal | 612        | 5123                     |
| 467         | 2020-02-27T00:00:00.000Z | deposit    | 29         | 5152                     |
| 467         | 2020-03-03T00:00:00.000Z | withdrawal | 978        | 6130                     |
| 467         | 2020-03-06T00:00:00.000Z | deposit    | 852        | 6982                     |
| 467         | 2020-03-10T00:00:00.000Z | purchase   | 129        | 6853                     |
| 467         | 2020-03-12T00:00:00.000Z | purchase   | 809        | 5676                     |
| 467         | 2020-03-12T00:00:00.000Z | purchase   | 368        | 5676                     |
| 467         | 2020-03-26T00:00:00.000Z | deposit    | 116        | 5792                     |
| 467         | 2020-03-28T00:00:00.000Z | deposit    | 488        | 6280                     |
| 467         | 2020-04-03T00:00:00.000Z | withdrawal | 691        | 6971                     |
| 467         | 2020-04-06T00:00:00.000Z | withdrawal | 873        | 7844                     |
| 468         | 2020-01-25T00:00:00.000Z | deposit    | 939        | 939                      |
| 468         | 2020-01-29T00:00:00.000Z | purchase   | 900        | 39                       |
| 468         | 2020-02-14T00:00:00.000Z | purchase   | 902        | -863                     |
| 468         | 2020-02-19T00:00:00.000Z | deposit    | 708        | -155                     |
| 468         | 2020-03-02T00:00:00.000Z | deposit    | 40         | -89                      |
| 468         | 2020-03-02T00:00:00.000Z | withdrawal | 26         | -89                      |
| 468         | 2020-03-18T00:00:00.000Z | purchase   | 776        | -865                     |
| 469         | 2020-01-17T00:00:00.000Z | deposit    | 297        | 297                      |
| 469         | 2020-01-30T00:00:00.000Z | deposit    | 89         | 386                      |
| 469         | 2020-02-04T00:00:00.000Z | deposit    | 914        | 1300                     |
| 469         | 2020-02-13T00:00:00.000Z | deposit    | 140        | 1440                     |
| 469         | 2020-02-17T00:00:00.000Z | withdrawal | 630        | 2070                     |
| 469         | 2020-02-21T00:00:00.000Z | deposit    | 883        | 2953                     |
| 469         | 2020-02-28T00:00:00.000Z | deposit    | 468        | 3421                     |
| 469         | 2020-03-01T00:00:00.000Z | withdrawal | 789        | 4210                     |
| 469         | 2020-03-03T00:00:00.000Z | withdrawal | 295        | 4505                     |
| 469         | 2020-03-08T00:00:00.000Z | deposit    | 437        | 4181                     |
| 469         | 2020-03-08T00:00:00.000Z | purchase   | 761        | 4181                     |
| 469         | 2020-03-23T00:00:00.000Z | deposit    | 15         | 4196                     |
| 469         | 2020-03-24T00:00:00.000Z | purchase   | 703        | 3493                     |
| 469         | 2020-03-26T00:00:00.000Z | purchase   | 867        | 2626                     |
| 469         | 2020-04-10T00:00:00.000Z | purchase   | 735        | 1891                     |
| 470         | 2020-01-08T00:00:00.000Z | deposit    | 942        | 942                      |
| 470         | 2020-01-18T00:00:00.000Z | withdrawal | 565        | 1507                     |
| 470         | 2020-02-14T00:00:00.000Z | withdrawal | 688        | 2195                     |
| 471         | 2020-01-13T00:00:00.000Z | deposit    | 781        | 781                      |
| 471         | 2020-03-02T00:00:00.000Z | deposit    | 197        | 978                      |
| 471         | 2020-03-07T00:00:00.000Z | deposit    | 211        | 1189                     |
| 471         | 2020-03-09T00:00:00.000Z | deposit    | 49         | 1238                     |
| 471         | 2020-04-09T00:00:00.000Z | deposit    | 649        | 1887                     |
| 472         | 2020-01-18T00:00:00.000Z | deposit    | 495        | 495                      |
| 472         | 2020-01-19T00:00:00.000Z | withdrawal | 527        | 1022                     |
| 472         | 2020-01-29T00:00:00.000Z | deposit    | 843        | 1865                     |
| 472         | 2020-02-01T00:00:00.000Z | purchase   | 347        | 1518                     |
| 472         | 2020-02-11T00:00:00.000Z | purchase   | 666        | 852                      |
| 472         | 2020-02-27T00:00:00.000Z | deposit    | 87         | 939                      |
| 472         | 2020-03-05T00:00:00.000Z | deposit    | 78         | 1017                     |
| 472         | 2020-03-06T00:00:00.000Z | withdrawal | 499        | 1516                     |
| 472         | 2020-03-08T00:00:00.000Z | deposit    | 362        | 1878                     |
| 472         | 2020-03-20T00:00:00.000Z | deposit    | 182        | 2060                     |
| 472         | 2020-03-21T00:00:00.000Z | withdrawal | 513        | 2573                     |
| 472         | 2020-03-30T00:00:00.000Z | deposit    | 537        | 3110                     |
| 472         | 2020-04-01T00:00:00.000Z | purchase   | 865        | 2233                     |
| 472         | 2020-04-01T00:00:00.000Z | purchase   | 12         | 2233                     |
| 472         | 2020-04-04T00:00:00.000Z | deposit    | 405        | 2638                     |
| 472         | 2020-04-06T00:00:00.000Z | purchase   | 903        | 1735                     |
| 472         | 2020-04-07T00:00:00.000Z | deposit    | 557        | 2407                     |
| 472         | 2020-04-07T00:00:00.000Z | deposit    | 115        | 2407                     |
| 472         | 2020-04-08T00:00:00.000Z | deposit    | 418        | 2825                     |
| 472         | 2020-04-14T00:00:00.000Z | deposit    | 920        | 3745                     |
| 472         | 2020-04-16T00:00:00.000Z | purchase   | 449        | 3296                     |
| 473         | 2020-01-17T00:00:00.000Z | deposit    | 657        | 657                      |
| 473         | 2020-01-27T00:00:00.000Z | deposit    | 909        | 1566                     |
| 473         | 2020-01-29T00:00:00.000Z | purchase   | 834        | 732                      |
| 473         | 2020-01-31T00:00:00.000Z | purchase   | 915        | -183                     |
| 473         | 2020-02-06T00:00:00.000Z | withdrawal | 244        | 61                       |
| 473         | 2020-02-26T00:00:00.000Z | withdrawal | 437        | 498                      |
| 473         | 2020-03-01T00:00:00.000Z | purchase   | 900        | -402                     |
| 473         | 2020-03-04T00:00:00.000Z | withdrawal | 168        | -234                     |
| 473         | 2020-03-10T00:00:00.000Z | withdrawal | 954        | 720                      |
| 473         | 2020-03-12T00:00:00.000Z | deposit    | 375        | 1095                     |
| 473         | 2020-03-16T00:00:00.000Z | purchase   | 709        | 386                      |
| 473         | 2020-03-28T00:00:00.000Z | purchase   | 116        | 270                      |
| 473         | 2020-03-30T00:00:00.000Z | withdrawal | 303        | 573                      |
| 473         | 2020-03-31T00:00:00.000Z | deposit    | 9          | 582                      |
| 473         | 2020-04-02T00:00:00.000Z | purchase   | 578        | 4                        |
| 473         | 2020-04-05T00:00:00.000Z | withdrawal | 721        | 725                      |
| 473         | 2020-04-08T00:00:00.000Z | withdrawal | 843        | 1568                     |
| 474         | 2020-01-02T00:00:00.000Z | deposit    | 928        | 928                      |
| 474         | 2020-02-08T00:00:00.000Z | withdrawal | 789        | 1717                     |
| 474         | 2020-03-08T00:00:00.000Z | withdrawal | 398        | 2115                     |
| 475         | 2020-01-03T00:00:00.000Z | deposit    | 552        | 552                      |
| 475         | 2020-01-09T00:00:00.000Z | deposit    | 713        | 1265                     |
| 475         | 2020-01-10T00:00:00.000Z | withdrawal | 981        | 2722                     |
| 475         | 2020-01-10T00:00:00.000Z | withdrawal | 476        | 2722                     |
| 475         | 2020-01-17T00:00:00.000Z | purchase   | 72         | 2650                     |
| 475         | 2020-01-21T00:00:00.000Z | deposit    | 525        | 3175                     |
| 475         | 2020-01-23T00:00:00.000Z | withdrawal | 849        | 4024                     |
| 475         | 2020-01-26T00:00:00.000Z | purchase   | 85         | 3939                     |
| 475         | 2020-02-11T00:00:00.000Z | deposit    | 222        | 4161                     |
| 475         | 2020-02-13T00:00:00.000Z | purchase   | 614        | 3547                     |
| 475         | 2020-02-28T00:00:00.000Z | withdrawal | 952        | 4550                     |
| 475         | 2020-02-28T00:00:00.000Z | deposit    | 51         | 4550                     |
| 475         | 2020-03-01T00:00:00.000Z | withdrawal | 970        | 5520                     |
| 475         | 2020-03-03T00:00:00.000Z | purchase   | 710        | 4810                     |
| 475         | 2020-03-05T00:00:00.000Z | withdrawal | 523        | 5333                     |
| 475         | 2020-03-16T00:00:00.000Z | withdrawal | 522        | 5855                     |
| 475         | 2020-03-19T00:00:00.000Z | purchase   | 4          | 5851                     |
| 475         | 2020-03-20T00:00:00.000Z | withdrawal | 535        | 6386                     |
| 475         | 2020-03-24T00:00:00.000Z | deposit    | 596        | 6982                     |
| 475         | 2020-03-28T00:00:00.000Z | purchase   | 439        | 6543                     |
| 476         | 2020-01-27T00:00:00.000Z | deposit    | 392        | 392                      |
| 476         | 2020-01-31T00:00:00.000Z | withdrawal | 868        | 1260                     |
| 476         | 2020-02-15T00:00:00.000Z | deposit    | 567        | 1827                     |
| 476         | 2020-02-17T00:00:00.000Z | purchase   | 227        | 1286                     |
| 476         | 2020-02-17T00:00:00.000Z | purchase   | 314        | 1286                     |
| 476         | 2020-02-18T00:00:00.000Z | purchase   | 826        | 460                      |
| 476         | 2020-02-19T00:00:00.000Z | purchase   | 689        | -229                     |
| 476         | 2020-02-26T00:00:00.000Z | withdrawal | 507        | 278                      |
| 476         | 2020-02-28T00:00:00.000Z | deposit    | 469        | 747                      |
| 476         | 2020-03-03T00:00:00.000Z | deposit    | 551        | 1298                     |
| 476         | 2020-03-10T00:00:00.000Z | purchase   | 395        | 903                      |
| 476         | 2020-03-21T00:00:00.000Z | purchase   | 575        | 328                      |
| 476         | 2020-03-29T00:00:00.000Z | withdrawal | 943        | 1271                     |
| 476         | 2020-04-04T00:00:00.000Z | deposit    | 851        | 2122                     |
| 476         | 2020-04-05T00:00:00.000Z | purchase   | 581        | 1541                     |
| 476         | 2020-04-06T00:00:00.000Z | purchase   | 916        | 625                      |
| 476         | 2020-04-09T00:00:00.000Z | withdrawal | 338        | 963                      |
| 476         | 2020-04-11T00:00:00.000Z | purchase   | 654        | 309                      |
| 476         | 2020-04-23T00:00:00.000Z | purchase   | 898        | -589                     |
| 476         | 2020-04-25T00:00:00.000Z | deposit    | 929        | 340                      |
| 477         | 2020-01-04T00:00:00.000Z | deposit    | 101        | 101                      |
| 477         | 2020-01-06T00:00:00.000Z | purchase   | 209        | -108                     |
| 477         | 2020-01-08T00:00:00.000Z | withdrawal | 589        | 481                      |
| 477         | 2020-01-13T00:00:00.000Z | withdrawal | 894        | 1375                     |
| 477         | 2020-01-14T00:00:00.000Z | purchase   | 235        | 1140                     |
| 477         | 2020-01-22T00:00:00.000Z | withdrawal | 429        | 1569                     |
| 477         | 2020-01-31T00:00:00.000Z | withdrawal | 351        | 1492                     |
| 477         | 2020-01-31T00:00:00.000Z | purchase   | 428        | 1492                     |
| 477         | 2020-02-02T00:00:00.000Z | withdrawal | 274        | 1766                     |
| 477         | 2020-02-03T00:00:00.000Z | withdrawal | 193        | 1959                     |
| 477         | 2020-02-06T00:00:00.000Z | withdrawal | 935        | 2894                     |
| 477         | 2020-02-29T00:00:00.000Z | purchase   | 156        | 2738                     |
| 477         | 2020-03-15T00:00:00.000Z | withdrawal | 531        | 3269                     |
| 477         | 2020-03-16T00:00:00.000Z | deposit    | 624        | 3893                     |
| 477         | 2020-03-17T00:00:00.000Z | withdrawal | 444        | 4337                     |
| 477         | 2020-03-28T00:00:00.000Z | purchase   | 849        | 3488                     |
| 477         | 2020-03-29T00:00:00.000Z | withdrawal | 746        | 4234                     |
| 478         | 2020-01-08T00:00:00.000Z | deposit    | 351        | 359                      |
| 478         | 2020-01-08T00:00:00.000Z | withdrawal | 8          | 359                      |
| 478         | 2020-01-15T00:00:00.000Z | purchase   | 88         | 271                      |
| 478         | 2020-01-26T00:00:00.000Z | purchase   | 967        | -696                     |
| 478         | 2020-02-05T00:00:00.000Z | deposit    | 844        | 148                      |
| 478         | 2020-02-18T00:00:00.000Z | deposit    | 968        | 1116                     |
| 478         | 2020-02-22T00:00:00.000Z | deposit    | 761        | 1877                     |
| 478         | 2020-02-26T00:00:00.000Z | deposit    | 330        | 2207                     |
| 478         | 2020-02-29T00:00:00.000Z | deposit    | 87         | 2294                     |
| 478         | 2020-03-03T00:00:00.000Z | deposit    | 434        | 2728                     |
| 478         | 2020-03-07T00:00:00.000Z | deposit    | 55         | 2783                     |
| 478         | 2020-03-09T00:00:00.000Z | withdrawal | 680        | 3463                     |
| 479         | 2020-01-23T00:00:00.000Z | deposit    | 320        | 320                      |
| 479         | 2020-02-29T00:00:00.000Z | purchase   | 647        | -327                     |
| 479         | 2020-03-31T00:00:00.000Z | deposit    | 840        | 513                      |
| 480         | 2020-01-29T00:00:00.000Z | deposit    | 522        | 522                      |
| 480         | 2020-03-22T00:00:00.000Z | purchase   | 757        | -235                     |
| 480         | 2020-04-11T00:00:00.000Z | deposit    | 553        | 318                      |
| 480         | 2020-04-14T00:00:00.000Z | purchase   | 478        | -160                     |
| 480         | 2020-04-21T00:00:00.000Z | withdrawal | 5          | -155                     |
| 481         | 2020-01-02T00:00:00.000Z | deposit    | 42         | 42                       |
| 481         | 2020-01-08T00:00:00.000Z | purchase   | 606        | -1354                    |
| 481         | 2020-01-08T00:00:00.000Z | purchase   | 790        | -1354                    |
| 481         | 2020-01-13T00:00:00.000Z | withdrawal | 42         | -1312                    |
| 481         | 2020-02-10T00:00:00.000Z | withdrawal | 879        | -433                     |
| 481         | 2020-02-17T00:00:00.000Z | withdrawal | 123        | -310                     |
| 481         | 2020-02-27T00:00:00.000Z | purchase   | 507        | -817                     |
| 481         | 2020-03-09T00:00:00.000Z | withdrawal | 431        | -386                     |
| 481         | 2020-03-16T00:00:00.000Z | withdrawal | 179        | 519                      |
| 481         | 2020-03-16T00:00:00.000Z | withdrawal | 726        | 519                      |
| 481         | 2020-03-25T00:00:00.000Z | deposit    | 39         | 558                      |
| 481         | 2020-03-29T00:00:00.000Z | deposit    | 808        | 1366                     |
| 482         | 2020-01-01T00:00:00.000Z | deposit    | 674        | 674                      |
| 482         | 2020-01-06T00:00:00.000Z | withdrawal | 547        | 1221                     |
| 482         | 2020-01-09T00:00:00.000Z | withdrawal | 60         | 1281                     |
| 482         | 2020-01-19T00:00:00.000Z | deposit    | 764        | 2045                     |
| 482         | 2020-01-29T00:00:00.000Z | withdrawal | 445        | 2490                     |
| 482         | 2020-02-04T00:00:00.000Z | withdrawal | 656        | 3146                     |
| 482         | 2020-02-19T00:00:00.000Z | withdrawal | 26         | 3172                     |
| 482         | 2020-02-22T00:00:00.000Z | withdrawal | 597        | 3769                     |
| 482         | 2020-02-25T00:00:00.000Z | deposit    | 206        | 3975                     |
| 482         | 2020-03-05T00:00:00.000Z | purchase   | 646        | 4078                     |
| 482         | 2020-03-05T00:00:00.000Z | deposit    | 413        | 4078                     |
| 482         | 2020-03-05T00:00:00.000Z | withdrawal | 336        | 4078                     |
| 483         | 2020-01-18T00:00:00.000Z | deposit    | 481        | 481                      |
| 483         | 2020-01-24T00:00:00.000Z | deposit    | 588        | 1195                     |
| 483         | 2020-01-24T00:00:00.000Z | deposit    | 126        | 1195                     |
| 483         | 2020-01-27T00:00:00.000Z | purchase   | 36         | 1159                     |
| 483         | 2020-01-30T00:00:00.000Z | deposit    | 879        | 2038                     |
| 483         | 2020-03-06T00:00:00.000Z | withdrawal | 371        | 3246                     |
| 483         | 2020-03-06T00:00:00.000Z | deposit    | 837        | 3246                     |
| 483         | 2020-03-07T00:00:00.000Z | deposit    | 299        | 3545                     |
| 483         | 2020-03-12T00:00:00.000Z | withdrawal | 892        | 4437                     |
| 483         | 2020-03-14T00:00:00.000Z | withdrawal | 199        | 4636                     |
| 483         | 2020-03-28T00:00:00.000Z | withdrawal | 975        | 5611                     |
| 483         | 2020-03-30T00:00:00.000Z | withdrawal | 926        | 6537                     |
| 483         | 2020-04-03T00:00:00.000Z | deposit    | 293        | 6830                     |
| 483         | 2020-04-14T00:00:00.000Z | deposit    | 650        | 7480                     |
| 483         | 2020-04-15T00:00:00.000Z | deposit    | 576        | 8056                     |
| 484         | 2020-01-28T00:00:00.000Z | deposit    | 871        | 871                      |
| 484         | 2020-03-23T00:00:00.000Z | withdrawal | 56         | 927                      |
| 484         | 2020-03-25T00:00:00.000Z | deposit    | 981        | 1908                     |
| 485         | 2020-01-03T00:00:00.000Z | deposit    | 524        | 524                      |
| 485         | 2020-01-21T00:00:00.000Z | purchase   | 508        | 16                       |
| 485         | 2020-02-11T00:00:00.000Z | deposit    | 827        | 843                      |
| 485         | 2020-02-17T00:00:00.000Z | deposit    | 664        | 1507                     |
| 485         | 2020-03-01T00:00:00.000Z | deposit    | 877        | 2384                     |
| 485         | 2020-03-14T00:00:00.000Z | withdrawal | 802        | 3186                     |
| 485         | 2020-03-24T00:00:00.000Z | deposit    | 620        | 3806                     |
| 486         | 2020-01-11T00:00:00.000Z | deposit    | 412        | 412                      |
| 486         | 2020-01-21T00:00:00.000Z | withdrawal | 308        | 720                      |
| 486         | 2020-01-22T00:00:00.000Z | purchase   | 854        | -134                     |
| 486         | 2020-01-30T00:00:00.000Z | withdrawal | 882        | 748                      |
| 486         | 2020-02-08T00:00:00.000Z | withdrawal | 618        | 1366                     |
| 486         | 2020-03-10T00:00:00.000Z | withdrawal | 858        | 2224                     |
| 487         | 2020-01-15T00:00:00.000Z | deposit    | 39         | 39                       |
| 487         | 2020-01-17T00:00:00.000Z | deposit    | 24         | 63                       |
| 487         | 2020-01-18T00:00:00.000Z | deposit    | 372        | 435                      |
| 487         | 2020-01-25T00:00:00.000Z | purchase   | 451        | -16                      |
| 487         | 2020-01-31T00:00:00.000Z | purchase   | 556        | -572                     |
| 487         | 2020-02-03T00:00:00.000Z | withdrawal | 118        | -454                     |
| 487         | 2020-02-05T00:00:00.000Z | withdrawal | 620        | 1027                     |
| 487         | 2020-02-05T00:00:00.000Z | deposit    | 861        | 1027                     |
| 487         | 2020-02-06T00:00:00.000Z | purchase   | 702        | 325                      |
| 487         | 2020-02-16T00:00:00.000Z | deposit    | 421        | 746                      |
| 487         | 2020-02-21T00:00:00.000Z | deposit    | 165        | 911                      |
| 487         | 2020-02-22T00:00:00.000Z | deposit    | 877        | 1788                     |
| 487         | 2020-03-24T00:00:00.000Z | withdrawal | 150        | 1938                     |
| 487         | 2020-04-03T00:00:00.000Z | purchase   | 965        | 973                      |
| 487         | 2020-04-11T00:00:00.000Z | deposit    | 473        | 1446                     |
| 488         | 2020-01-08T00:00:00.000Z | deposit    | 304        | 304                      |
| 488         | 2020-01-11T00:00:00.000Z | withdrawal | 547        | 851                      |
| 488         | 2020-02-04T00:00:00.000Z | deposit    | 191        | 1042                     |
| 488         | 2020-02-21T00:00:00.000Z | deposit    | 349        | 1391                     |
| 488         | 2020-03-11T00:00:00.000Z | withdrawal | 709        | 2100                     |
| 488         | 2020-04-01T00:00:00.000Z | deposit    | 221        | 2321                     |
| 489         | 2020-01-15T00:00:00.000Z | deposit    | 556        | 556                      |
| 489         | 2020-02-10T00:00:00.000Z | deposit    | 545        | 1101                     |
| 489         | 2020-02-16T00:00:00.000Z | purchase   | 603        | 498                      |
| 489         | 2020-02-17T00:00:00.000Z | deposit    | 770        | 1268                     |
| 489         | 2020-02-28T00:00:00.000Z | deposit    | 540        | 1808                     |
| 489         | 2020-03-09T00:00:00.000Z | deposit    | 912        | 2720                     |
| 489         | 2020-03-10T00:00:00.000Z | deposit    | 981        | 3701                     |
| 489         | 2020-03-23T00:00:00.000Z | purchase   | 63         | 3638                     |
| 489         | 2020-03-26T00:00:00.000Z | purchase   | 527        | 3111                     |
| 489         | 2020-03-28T00:00:00.000Z | deposit    | 231        | 3342                     |
| 489         | 2020-04-05T00:00:00.000Z | withdrawal | 31         | 3373                     |
| 489         | 2020-04-09T00:00:00.000Z | deposit    | 673        | 4046                     |
| 489         | 2020-04-10T00:00:00.000Z | deposit    | 826        | 4872                     |
| 489         | 2020-04-11T00:00:00.000Z | withdrawal | 114        | 4920                     |
| 489         | 2020-04-11T00:00:00.000Z | purchase   | 66         | 4920                     |
| 489         | 2020-04-12T00:00:00.000Z | deposit    | 523        | 5628                     |
| 489         | 2020-04-12T00:00:00.000Z | deposit    | 185        | 5628                     |
| 490         | 2020-01-23T00:00:00.000Z | deposit    | 271        | 271                      |
| 490         | 2020-02-25T00:00:00.000Z | deposit    | 447        | 718                      |
| 490         | 2020-02-28T00:00:00.000Z | purchase   | 376        | 342                      |
| 490         | 2020-04-07T00:00:00.000Z | purchase   | 318        | 24                       |
| 491         | 2020-01-08T00:00:00.000Z | deposit    | 18         | 18                       |
| 491         | 2020-01-19T00:00:00.000Z | withdrawal | 837        | 855                      |
| 491         | 2020-01-27T00:00:00.000Z | deposit    | 943        | 1798                     |
| 491         | 2020-01-30T00:00:00.000Z | purchase   | 127        | 1671                     |
| 491         | 2020-02-07T00:00:00.000Z | deposit    | 3          | 1674                     |
| 491         | 2020-02-09T00:00:00.000Z | deposit    | 442        | 2116                     |
| 491         | 2020-02-11T00:00:00.000Z | withdrawal | 656        | 2772                     |
| 491         | 2020-02-24T00:00:00.000Z | deposit    | 512        | 3284                     |
| 491         | 2020-03-04T00:00:00.000Z | withdrawal | 334        | 4539                     |
| 491         | 2020-03-04T00:00:00.000Z | withdrawal | 921        | 4539                     |
| 491         | 2020-03-08T00:00:00.000Z | purchase   | 526        | 4013                     |
| 491         | 2020-03-12T00:00:00.000Z | deposit    | 892        | 4905                     |
| 491         | 2020-03-18T00:00:00.000Z | withdrawal | 759        | 5664                     |
| 491         | 2020-03-28T00:00:00.000Z | purchase   | 969        | 4695                     |
| 492         | 2020-01-05T00:00:00.000Z | deposit    | 812        | 812                      |
| 492         | 2020-01-10T00:00:00.000Z | purchase   | 881        | -69                      |
| 492         | 2020-01-13T00:00:00.000Z | purchase   | 368        | -437                     |
| 492         | 2020-01-19T00:00:00.000Z | withdrawal | 418        | -19                      |
| 492         | 2020-01-27T00:00:00.000Z | purchase   | 999        | -1018                    |
| 492         | 2020-01-29T00:00:00.000Z | deposit    | 171        | -847                     |
| 492         | 2020-01-30T00:00:00.000Z | deposit    | 945        | 98                       |
| 492         | 2020-02-15T00:00:00.000Z | withdrawal | 674        | 772                      |
| 492         | 2020-02-28T00:00:00.000Z | deposit    | 13         | 785                      |
| 492         | 2020-03-07T00:00:00.000Z | purchase   | 32         | 753                      |
| 492         | 2020-03-09T00:00:00.000Z | purchase   | 53         | 700                      |
| 492         | 2020-03-10T00:00:00.000Z | deposit    | 299        | 999                      |
| 492         | 2020-03-14T00:00:00.000Z | withdrawal | 367        | 1366                     |
| 492         | 2020-03-27T00:00:00.000Z | withdrawal | 581        | 1947                     |
| 493         | 2020-01-15T00:00:00.000Z | deposit    | 845        | 845                      |
| 493         | 2020-02-14T00:00:00.000Z | withdrawal | 483        | 1501                     |
| 493         | 2020-02-14T00:00:00.000Z | deposit    | 173        | 1501                     |
| 493         | 2020-02-20T00:00:00.000Z | withdrawal | 894        | 2395                     |
| 493         | 2020-02-29T00:00:00.000Z | withdrawal | 465        | 2860                     |
| 493         | 2020-04-07T00:00:00.000Z | deposit    | 918        | 3778                     |
| 493         | 2020-04-12T00:00:00.000Z | withdrawal | 832        | 4610                     |
| 494         | 2020-01-20T00:00:00.000Z | deposit    | 529        | 529                      |
| 494         | 2020-02-03T00:00:00.000Z | withdrawal | 286        | 815                      |
| 494         | 2020-02-13T00:00:00.000Z | deposit    | 666        | 1481                     |
| 494         | 2020-03-12T00:00:00.000Z | deposit    | 538        | 2019                     |
| 495         | 2020-01-17T00:00:00.000Z | deposit    | 433        | 433                      |
| 495         | 2020-01-24T00:00:00.000Z | purchase   | 719        | -286                     |
| 495         | 2020-02-17T00:00:00.000Z | purchase   | 422        | -676                     |
| 495         | 2020-02-17T00:00:00.000Z | deposit    | 32         | -676                     |
| 495         | 2020-02-27T00:00:00.000Z | withdrawal | 762        | 86                       |
| 495         | 2020-03-21T00:00:00.000Z | deposit    | 811        | 897                      |
| 495         | 2020-03-28T00:00:00.000Z | deposit    | 538        | 1435                     |
| 496         | 2020-01-06T00:00:00.000Z | deposit    | 47         | 47                       |
| 496         | 2020-02-11T00:00:00.000Z | withdrawal | 989        | 1036                     |
| 496         | 2020-02-19T00:00:00.000Z | purchase   | 939        | 711                      |
| 496         | 2020-02-19T00:00:00.000Z | withdrawal | 614        | 711                      |
| 496         | 2020-02-22T00:00:00.000Z | withdrawal | 581        | 1292                     |
| 496         | 2020-03-14T00:00:00.000Z | deposit    | 650        | 1942                     |
| 497         | 2020-01-30T00:00:00.000Z | deposit    | 754        | 754                      |
| 497         | 2020-02-15T00:00:00.000Z | purchase   | 291        | 463                      |
| 497         | 2020-02-17T00:00:00.000Z | deposit    | 540        | 1003                     |
| 497         | 2020-03-07T00:00:00.000Z | deposit    | 736        | 1739                     |
| 497         | 2020-04-21T00:00:00.000Z | deposit    | 942        | 2681                     |
| 497         | 2020-04-24T00:00:00.000Z | purchase   | 1          | 2680                     |
| 498         | 2020-01-19T00:00:00.000Z | deposit    | 774        | 774                      |
| 498         | 2020-01-28T00:00:00.000Z | deposit    | 277        | 1051                     |
| 498         | 2020-01-31T00:00:00.000Z | deposit    | 309        | 1360                     |
| 498         | 2020-02-05T00:00:00.000Z | deposit    | 835        | 2195                     |
| 498         | 2020-03-12T00:00:00.000Z | deposit    | 225        | 2420                     |
| 498         | 2020-03-16T00:00:00.000Z | deposit    | 296        | 2716                     |
| 498         | 2020-03-25T00:00:00.000Z | deposit    | 973        | 2989                     |
| 498         | 2020-03-25T00:00:00.000Z | purchase   | 700        | 2989                     |
| 498         | 2020-04-16T00:00:00.000Z | deposit    | 499        | 3488                     |
| 499         | 2020-01-02T00:00:00.000Z | deposit    | 147        | 147                      |
| 499         | 2020-01-04T00:00:00.000Z | deposit    | 849        | 996                      |
| 499         | 2020-01-12T00:00:00.000Z | withdrawal | 934        | 1930                     |
| 499         | 2020-01-15T00:00:00.000Z | purchase   | 71         | 1859                     |
| 499         | 2020-01-18T00:00:00.000Z | deposit    | 150        | 2009                     |
| 499         | 2020-01-20T00:00:00.000Z | withdrawal | 699        | 2708                     |
| 499         | 2020-01-31T00:00:00.000Z | deposit    | 254        | 2962                     |
| 499         | 2020-02-10T00:00:00.000Z | deposit    | 925        | 3887                     |
| 499         | 2020-02-11T00:00:00.000Z | purchase   | 416        | 3471                     |
| 499         | 2020-02-17T00:00:00.000Z | withdrawal | 228        | 3699                     |
| 499         | 2020-02-20T00:00:00.000Z | deposit    | 547        | 5137                     |
| 499         | 2020-02-20T00:00:00.000Z | deposit    | 891        | 5137                     |
| 499         | 2020-03-01T00:00:00.000Z | purchase   | 279        | 4858                     |
| 499         | 2020-03-04T00:00:00.000Z | purchase   | 367        | 4491                     |
| 499         | 2020-03-12T00:00:00.000Z | deposit    | 754        | 5245                     |
| 499         | 2020-03-15T00:00:00.000Z | purchase   | 627        | 4618                     |
| 499         | 2020-03-17T00:00:00.000Z | withdrawal | 297        | 4915                     |
| 500         | 2020-01-16T00:00:00.000Z | deposit    | 909        | 1136                     |
| 500         | 2020-01-16T00:00:00.000Z | deposit    | 227        | 1136                     |
| 500         | 2020-01-18T00:00:00.000Z | deposit    | 308        | 1444                     |
| 500         | 2020-01-25T00:00:00.000Z | withdrawal | 986        | 2430                     |
| 500         | 2020-01-27T00:00:00.000Z | deposit    | 214        | 2644                     |
| 500         | 2020-01-30T00:00:00.000Z | deposit    | 922        | 3566                     |
| 500         | 2020-02-01T00:00:00.000Z | deposit    | 715        | 4281                     |
| 500         | 2020-02-07T00:00:00.000Z | purchase   | 49         | 4232                     |
| 500         | 2020-02-23T00:00:00.000Z | deposit    | 721        | 4953                     |
| 500         | 2020-03-01T00:00:00.000Z | purchase   | 929        | 4024                     |
| 500         | 2020-03-02T00:00:00.000Z | deposit    | 862        | 4886                     |
| 500         | 2020-03-07T00:00:00.000Z | purchase   | 452        | 4434                     |
| 500         | 2020-03-11T00:00:00.000Z | purchase   | 426        | 4008                     |
| 500         | 2020-03-17T00:00:00.000Z | deposit    | 344        | 4352                     |
| 500         | 2020-03-22T00:00:00.000Z | withdrawal | 954        | 5306                     |
| 500         | 2020-03-25T00:00:00.000Z | deposit    | 825        | 6131                     |

---
**Query #2** minimum, average and maximum values of the running balance for each customer

    WITH running_balance AS
    (SELECT *, SUM(
    CASE
      WHEN txn_type = 'purchase' OR txn_type = 'withdraw' THEN  -1 * txn_amount
      ELSE txn_amount
    END)
    OVER(PARTITION BY customer_id ORDER BY txn_date) AS running_customer_balance 
    FROM data_bank.customer_transactions)
    
    SELECT customer_id, MIN(running_customer_balance) as min_balance, AVG(running_customer_balance) as avg_balance, MAX(running_customer_balance) as max_balance
    FROM running_balance
    GROUP BY customer_id;

| customer_id | min_balance | avg_balance            | max_balance |
| ----------- | ----------- | ---------------------- | ----------- |
| 1           | -640        | -151.0000000000000000  | 312         |
| 2           | 549         | 579.5000000000000000   | 610         |
| 3           | -821        | -326.4000000000000000  | 144         |
| 4           | 458         | 653.6666666666666667   | 848         |
| 5           | 974         | 2799.0909090909090909  | 4336        |
| 6           | -229        | 1437.8947368421052632  | 3535        |
| 7           | 887         | 2477.3076923076923077  | 3819        |
| 8           | -359        | 1343.1000000000000000  | 2676        |
| 9           | 669         | 2555.7000000000000000  | 5494        |
| 10          | -219        | 1914.8333333333333333  | 3286        |
| 11          | -1744       | -734.7058823529411765  | 225         |
| 12          | 202         | 889.5000000000000000   | 1993        |
| 13          | 566         | 1930.8461538461538462  | 3767        |
| 14          | 205         | 1339.0000000000000000  | 2165        |
| 15          | 379         | 740.5000000000000000   | 1102        |
| 16          | -104        | 967.4117647058823529   | 1964        |
| 17          | 465         | 927.6666666666666667   | 1380        |
| 18          | 757         | 2127.5000000000000000  | 3207        |
| 19          | -129        | 365.1428571428571429   | 1282        |
| 20          | 868         | 1803.2857142857142857  | 2578        |
| 21          | -195        | 1375.5555555555555556  | 3855        |
| 22          | -356        | 2341.7368421052631579  | 5910        |
| 23          | 94          | 684.6666666666666667   | 1336        |
| 24          | 615         | 1482.9000000000000000  | 2121        |
| 25          | 174         | 1975.0000000000000000  | 3436        |
| 26          | 878         | 1776.1666666666666667  | 3572        |
| 27          | 809         | 3253.0000000000000000  | 5122        |
| 28          | -44         | 753.3750000000000000   | 2048        |
| 29          | 217         | 3243.1176470588235294  | 6386        |
| 30          | 33          | 713.7500000000000000   | 1436        |
| 31          | -164        | 600.2500000000000000   | 1717        |
| 32          | -67         | 1000.3076923076923077  | 2062        |
| 33          | -37         | 935.1111111111111111   | 1993        |
| 34          | 580         | 1194.0000000000000000  | 1669        |
| 35          | 272         | 1195.0769230769230769  | 2046        |
| 36          | 149         | 1936.7000000000000000  | 3299        |
| 37          | -624        | 1334.3181818181818182  | 3773        |
| 38          | -1295       | -285.3000000000000000  | 842         |
| 39          | 1429        | 3618.8823529411764706  | 6832        |
| 40          | 857         | 2561.3636363636363636  | 3806        |
| 41          | 790         | 3807.6111111111111111  | 6029        |
| 42          | 154         | 1523.8571428571428571  | 2459        |
| 43          | 318         | 1690.7272727272727273  | 2923        |
| 44          | 71          | 897.2500000000000000   | 1503        |
| 45          | 650         | 2852.8333333333333333  | 5424        |
| 46          | -139        | 779.9230769230769231   | 1489        |
| 47          | -244        | 2349.1764705882352941  | 5144        |
| 48          | 427         | 1690.7368421052631579  | 2710        |
| 49          | 305         | 3488.5789473684210526  | 5597        |
| 50          | 899         | 2815.8571428571428571  | 4169        |
| 51          | -622        | 436.5454545454545455   | 1502        |
| 52          | 908         | 1654.7500000000000000  | 2612        |
| 53          | -75         | 943.2500000000000000   | 1989        |
| 54          | 138         | 1094.2500000000000000  | 1658        |
| 55          | -178        | 507.2727272727272727   | 1599        |
| 56          | -106        | 806.8947368421052632   | 1646        |
| 57          | -866        | 201.0000000000000000   | 907         |
| 58          | 726         | 3150.4117647058823529  | 4463        |
| 59          | 924         | 1864.1428571428571429  | 2728        |
| 60          | -189        | 1163.2500000000000000  | 2881        |
| 61          | -433        | 2773.7272727272727273  | 5539        |
| 62          | -763        | -252.3333333333333333  | 218         |
| 63          | -764        | 233.0769230769230769   | 1343        |
| 64          | 442         | 2149.1111111111111111  | 3340        |
| 65          | -265        | 275.7142857142857143   | 690         |
| 66          | 698         | 1446.1000000000000000  | 2048        |
| 67          | 79          | 2491.8000000000000000  | 4208        |
| 68          | -690        | -158.2857142857142857  | 574         |
| 69          | -301        | 1550.5000000000000000  | 3159        |
| 70          | 654         | 2119.9285714285714286  | 4308        |
| 71          | 128         | 721.0000000000000000   | 1521        |
| 72          | 796         | 2349.2727272727272727  | 3310        |
| 73          | 442         | 477.5000000000000000   | 513         |
| 74          | 229         | 273.5000000000000000   | 318         |
| 75          | 234         | 264.0000000000000000   | 294         |
| 76          | 1194        | 4592.7058823529411765  | 7449        |
| 77          | 120         | 913.6000000000000000   | 1621        |
| 78          | -881        | -227.7272727272727273  | 986         |
| 79          | 521         | 1041.3333333333333333  | 1380        |
| 80          | 199         | 834.0000000000000000   | 1190        |
| 81          | -399        | 1825.8333333333333333  | 3599        |
| 82          | -609        | 1112.1875000000000000  | 3147        |
| 83          | 618         | 1253.9333333333333333  | 2249        |
| 84          | 609         | 788.5000000000000000   | 968         |
| 85          | 467         | 729.6666666666666667   | 1076        |
| 86          | 12          | 4322.0526315789473684  | 8218        |
| 87          | 777         | 1660.2857142857142857  | 2827        |
| 88          | -566        | 248.0000000000000000   | 922         |
| 89          | -719        | 1593.4375000000000000  | 3796        |
| 90          | 890         | 3507.9500000000000000  | 5366        |
| 91          | 146         | 1596.2105263157894737  | 3219        |
| 92          | 142         | 687.3333333333333333   | 985         |
| 93          | 557         | 3651.5625000000000000  | 6271        |
| 94          | 902         | 2751.6250000000000000  | 4742        |
| 95          | 19          | 3164.1333333333333333  | 6462        |
| 96          | 942         | 2356.7777777777777778  | 4767        |
| 97          | 681         | 1956.5625000000000000  | 3137        |
| 98          | 622         | 1835.9000000000000000  | 3656        |
| 99          | 160         | 852.0000000000000000   | 1161        |
| 100         | -1386       | -141.7777777777777778  | 1081        |
| 101         | -484        | 730.1428571428571429   | 1795        |
| 102         | 186         | 2920.7142857142857143  | 7116        |
| 103         | 646         | 1312.6923076923076923  | 1970        |
| 104         | 943         | 2469.0000000000000000  | 4494        |
| 105         | 166         | 1083.0909090909090909  | 1961        |
| 106         | 456         | 2773.2142857142857143  | 4780        |
| 107         | -144        | 265.3333333333333333   | 538         |
| 108         | 1           | 1784.2000000000000000  | 3238        |
| 109         | 429         | 1507.2500000000000000  | 2491        |
| 110         | 888         | 5980.5000000000000000  | 10423       |
| 111         | 101         | 463.6666666666666667   | 827         |
| 112         | 945         | 2217.7500000000000000  | 3045        |
| 113         | -511        | 1134.3571428571428571  | 2992        |
| 114         | 169         | 685.0000000000000000   | 1143        |
| 115         | -453        | 730.8000000000000000   | 2241        |
| 116         | 53          | 320.8000000000000000   | 543         |
| 117         | 5           | 849.8571428571428571   | 2072        |
| 118         | -1302       | -464.8750000000000000  | 683         |
| 119         | 62          | 847.0000000000000000   | 1448        |
| 120         | 824         | 2808.5882352941176471  | 4243        |
| 121         | 335         | 1441.7272727272727273  | 2320        |
| 122         | 164         | 1744.8571428571428571  | 3493        |
| 123         | -697        | 794.0000000000000000   | 2546        |
| 124         | 159         | 3256.8333333333333333  | 6101        |
| 125         | 377         | 954.6153846153846154   | 2065        |
| 126         | 545         | 2468.8666666666666667  | 5354        |
| 127         | 217         | 864.0000000000000000   | 1672        |
| 128         | -113        | 592.7500000000000000   | 1128        |
| 129         | 568         | 2216.4285714285714286  | 4060        |
| 130         | 557         | 1762.0000000000000000  | 3252        |
| 131         | 86          | 2993.9545454545454545  | 5121        |
| 132         | -1253       | -213.8000000000000000  | 1020        |
| 133         | 279         | 698.3333333333333333   | 914         |
| 134         | 358         | 3660.7777777777777778  | 5832        |
| 135         | 949         | 2776.4545454545454545  | 3886        |
| 136         | 882         | 2504.9166666666666667  | 3809        |
| 137         | -356        | 349.7500000000000000   | 881         |
| 138         | 520         | 3010.2666666666666667  | 4273        |
| 139         | 283         | 2484.0000000000000000  | 6699        |
| 140         | 803         | 3863.1764705882352941  | 7205        |
| 141         | -369        | 988.8888888888888889   | 2538        |
| 142         | 517         | 1633.0000000000000000  | 2391        |
| 143         | 362         | 1353.3125000000000000  | 2223        |
| 144         | 465         | 976.1250000000000000   | 2263        |
| 145         | -814        | 788.2777777777777778   | 2974        |
| 146         | -989        | 530.5000000000000000   | 1563        |
| 147         | 934         | 1430.5000000000000000  | 2032        |
| 148         | -1679       | -507.1250000000000000  | 196         |
| 149         | -154        | 1953.5833333333333333  | 4070        |
| 150         | 69          | 2225.2857142857142857  | 4355        |
| 151         | 58          | 1202.3333333333333333  | 2459        |
| 152         | 917         | 2944.3333333333333333  | 4560        |
| 153         | 354         | 2126.0000000000000000  | 3624        |
| 154         | -681        | 1175.4285714285714286  | 4356        |
| 155         | -1333       | 898.1000000000000000   | 3516        |
| 156         | 82          | 197.0000000000000000   | 312         |
| 157         | 138         | 2045.0000000000000000  | 4264        |
| 158         | -136        | 501.6363636363636364   | 1250        |
| 159         | 433         | 756.3333333333333333   | 1167        |
| 160         | 843         | 4466.2142857142857143  | 6689        |
| 161         | 439         | 1915.9523809523809524  | 4055        |
| 162         | 123         | 625.6666666666666667   | 970         |
| 163         | -822        | 123.2142857142857143   | 787         |
| 164         | 548         | 752.5000000000000000   | 957         |
| 165         | -351        | 1037.1363636363636364  | 3093        |
| 166         | 957         | 2012.6666666666666667  | 2839        |
| 167         | 51          | 1777.8500000000000000  | 4808        |
| 168         | -801        | -251.0000000000000000  | 301         |
| 169         | -24         | 1653.1428571428571429  | 3826        |
| 170         | 788         | 1954.2500000000000000  | 2645        |
| 171         | -594        | 2563.1333333333333333  | 6321        |
| 172         | 548         | 1773.3333333333333333  | 2740        |
| 173         | 720         | 2517.2000000000000000  | 3885        |
| 174         | 1142        | 2903.0909090909090909  | 6290        |
| 175         | 248         | 944.8235294117647059   | 1717        |
| 176         | 655         | 1691.7500000000000000  | 2364        |
| 177         | 351         | 3028.5000000000000000  | 5158        |
| 178         | 252         | 1254.9285714285714286  | 2464        |
| 179         | -2368       | -931.0454545454545455  | 37          |
| 180         | 114         | 1056.1666666666666667  | 2036        |
| 181         | 689         | 2056.8333333333333333  | 3086        |
| 182         | -771        | 647.7500000000000000   | 2557        |
| 183         | -291        | 2320.1578947368421053  | 5310        |
| 184         | -1453       | 41.2352941176470588    | 1424        |
| 185         | 626         | 2063.9473684210526316  | 4627        |
| 186         | 968         | 2494.4210526315789474  | 4720        |
| 187         | -2182       | -1029.3636363636363636 | -211        |
| 188         | 601         | 3689.4000000000000000  | 6285        |
| 189         | 304         | 991.0000000000000000   | 1840        |
| 190         | 10          | 436.8000000000000000   | 1178        |
| 191         | 769         | 1754.1666666666666667  | 2244        |
| 192         | 906         | 3386.0952380952380952  | 5829        |
| 193         | 486         | 587.5000000000000000   | 689         |
| 194         | -677        | 2193.6666666666666667  | 5490        |
| 195         | 406         | 447.5000000000000000   | 489         |
| 196         | 734         | 1737.4000000000000000  | 2406        |
| 197         | 203         | 3869.9523809523809524  | 7565        |
| 198         | 428         | 1737.7333333333333333  | 2809        |
| 199         | 530         | 1582.1666666666666667  | 2476        |
| 200         | 997         | 3340.2500000000000000  | 5147        |
| 201         | -383        | 1413.5294117647058824  | 4053        |
| 202         | 60          | 636.8823529411764706   | 1252        |
| 203         | 638         | 3497.6818181818181818  | 5427        |
| 204         | 749         | 1317.0000000000000000  | 1893        |
| 205         | -424        | 2884.7894736842105263  | 6461        |
| 206         | 811         | 1970.7333333333333333  | 3477        |
| 207         | 322         | 3383.7692307692307692  | 6374        |
| 208         | 406         | 768.0000000000000000   | 1361        |
| 209         | -203        | 2471.5714285714285714  | 4093        |
| 210         | 679         | 3656.3500000000000000  | 8502        |
| 211         | 485         | 4186.8947368421052632  | 7914        |
| 212         | 336         | 2855.7058823529411765  | 6011        |
| 213         | -787        | -53.6153846153846154   | 630         |
| 214         | -445        | 1497.7857142857142857  | 3810        |
| 215         | 697         | 1238.6666666666666667  | 1792        |
| 216         | 707         | 4405.0000000000000000  | 7388        |
| 217         | 783         | 5178.0000000000000000  | 8682        |
| 218         | -2369       | 469.9090909090909091   | 3167        |
| 219         | -405        | 1351.0625000000000000  | 3440        |
| 220         | 307         | 1466.3333333333333333  | 2716        |
| 221         | 147         | 1303.8181818181818182  | 2220        |
| 222         | 311         | 1820.0000000000000000  | 3131        |
| 223         | 431         | 3051.7500000000000000  | 5103        |
| 224         | -769        | 867.1818181818181818   | 2299        |
| 225         | 280         | 1550.3333333333333333  | 2269        |
| 226         | 686         | 2317.5454545454545455  | 4208        |
| 227         | 468         | 1784.7272727272727273  | 3047        |
| 228         | -630        | 146.5000000000000000   | 841         |
| 229         | 180         | 780.5000000000000000   | 1618        |
| 230         | 675         | 1748.6666666666666667  | 3068        |
| 231         | -33         | 417.8461538461538462   | 1376        |
| 232         | 542         | 1575.6250000000000000  | 3011        |
| 233         | 187         | 2115.8000000000000000  | 3742        |
| 234         | -1285       | 141.3636363636363636   | 1514        |
| 235         | -1963       | -599.4444444444444444  | 723         |
| 236         | 356         | 2730.1666666666666667  | 4738        |
| 237         | 106         | 2243.8461538461538462  | 4014        |
| 238         | 802         | 1596.0000000000000000  | 2755        |
| 239         | -10         | 1226.9230769230769231  | 3629        |
| 240         | 147         | 2309.1176470588235294  | 4687        |
| 241         | 20          | 90.5000000000000000    | 161         |
| 242         | 29          | 3659.6363636363636364  | 6382        |
| 243         | -192        | 602.8333333333333333   | 1331        |
| 244         | 508         | 1419.2857142857142857  | 2415        |
| 245         | 76          | 2572.1052631578947368  | 5781        |
| 246         | 506         | 1585.7000000000000000  | 2709        |
| 247         | 260         | 708.5714285714285714   | 1331        |
| 248         | 304         | 2275.7000000000000000  | 3994        |
| 249         | 336         | 878.6666666666666667   | 1235        |
| 250         | 356         | 1621.8571428571428571  | 4289        |
| 251         | 445         | 2193.7647058823529412  | 4165        |
| 252         | 289         | 572.0000000000000000   | 982         |
| 253         | 1806        | 2889.6923076923076923  | 5118        |
| 254         | -446        | 1208.5714285714285714  | 3544        |
| 255         | -548        | 67.5000000000000000    | 563         |
| 256         | 1695        | 2790.6315789473684211  | 4598        |
| 257         | -132        | 1299.1176470588235294  | 3276        |
| 258         | -2135       | -983.6000000000000000  | 590         |
| 259         | 72          | 2002.8750000000000000  | 5048        |
| 260         | 899         | 2348.5000000000000000  | 3813        |
| 261         | 746         | 1777.0000000000000000  | 2565        |
| 262         | 177         | 1351.1764705882352941  | 2894        |
| 263         | 112         | 398.0000000000000000   | 770         |
| 264         | 695         | 2074.9090909090909091  | 3780        |
| 265         | 607         | 1625.7894736842105263  | 3468        |
| 266         | 651         | 1267.8000000000000000  | 2152        |
| 267         | -165        | 2308.6111111111111111  | 5962        |
| 268         | 744         | 3479.1052631578947368  | 6042        |
| 269         | 178         | 2628.0526315789473684  | 4788        |
| 270         | 294         | 3230.0000000000000000  | 5685        |
| 271         | -867        | 1153.2500000000000000  | 2908        |
| 272         | -517        | 349.2222222222222222   | 995         |
| 273         | 876         | 3112.9000000000000000  | 4246        |
| 274         | 801         | 2330.9411764705882353  | 4441        |
| 275         | -179        | 2996.9000000000000000  | 6393        |
| 276         | -153        | 696.0666666666666667   | 1570        |
| 277         | 615         | 1224.8000000000000000  | 1865        |
| 278         | 682         | 3684.0000000000000000  | 6202        |
| 279         | 214         | 2744.9166666666666667  | 4533        |
| 280         | 273         | 2325.5454545454545455  | 4075        |
| 281         | 616         | 3869.3181818181818182  | 9374        |
| 282         | -1661       | -926.6000000000000000  | 74          |
| 283         | 379         | 2571.1000000000000000  | 3438        |
| 284         | -775        | 434.4545454545454545   | 2191        |
| 285         | 360         | 1227.6666666666666667  | 1965        |
| 286         | 171         | 174.0000000000000000   | 177         |
| 287         | 658         | 1813.7272727272727273  | 3288        |
| 288         | -867        | 405.5555555555555556   | 1344        |
| 289         | 485         | 1547.4285714285714286  | 3453        |
| 290         | 51          | 2134.3846153846153846  | 4117        |
| 291         | 241         | 660.0000000000000000   | 938         |
| 292         | 136         | 2096.1333333333333333  | 4222        |
| 293         | -425        | 1620.9230769230769231  | 3928        |
| 294         | 307         | 1510.8333333333333333  | 3387        |
| 295         | -177        | 831.0000000000000000   | 1483        |
| 296         | 846         | 3476.8181818181818182  | 5822        |
| 297         | 469         | 3107.1176470588235294  | 4471        |
| 298         | 36          | 2453.6842105263157895  | 5791        |
| 299         | 881         | 2189.5333333333333333  | 3405        |
| 300         | 672         | 2225.4210526315789474  | 4327        |
| 301         | -444        | 861.0454545454545455   | 1964        |
| 302         | 225         | 1558.4166666666666667  | 3325        |
| 303         | -201        | 743.5333333333333333   | 1523        |
| 304         | 152         | 1795.3529411764705882  | 4339        |
| 305         | 36          | 1169.1111111111111111  | 2744        |
| 306         | 158         | 4201.1764705882352941  | 7911        |
| 307         | -696        | 1167.2727272727272727  | 3404        |
| 308         | -180        | 1001.0909090909090909  | 1733        |
| 309         | -1045       | 143.5000000000000000   | 1408        |
| 310         | 331         | 2206.6250000000000000  | 4474        |
| 311         | -76         | 2148.4545454545454545  | 3905        |
| 312         | -457        | 671.0000000000000000   | 2176        |
| 313         | -211        | 859.3571428571428571   | 1632        |
| 314         | -633        | -122.0000000000000000  | 448         |
| 315         | 1295        | 1556.5000000000000000  | 2287        |
| 316         | -3299       | -1711.0000000000000000 | 184         |
| 317         | 869         | 1190.0000000000000000  | 1469        |
| 318         | 720         | 1771.6000000000000000  | 2775        |
| 319         | 83          | 828.8333333333333333   | 1309        |
| 320         | 725         | 2609.0714285714285714  | 3667        |
| 321         | -160        | 291.8000000000000000   | 1064        |
| 322         | 965         | 3384.8181818181818182  | 4851        |
| 323         | 603         | 3357.5625000000000000  | 4772        |
| 324         | 203         | 1425.7142857142857143  | 2808        |
| 325         | 60          | 1815.2222222222222222  | 2957        |
| 326         | -211        | 228.0000000000000000   | 478         |
| 327         | -323        | 134.3333333333333333   | 919         |
| 328         | -965        | 369.9473684210526316   | 1679        |
| 329         | 723         | 2289.9166666666666667  | 3875        |
| 330         | 540         | 2306.0000000000000000  | 3398        |
| 331         | 951         | 2813.3125000000000000  | 4702        |
| 332         | -104        | 1966.2105263157894737  | 4242        |
| 333         | -229        | 967.5000000000000000   | 2451        |
| 334         | 933         | 2462.6250000000000000  | 4330        |
| 335         | -107        | 862.5000000000000000   | 2199        |
| 336         | 86          | 970.8000000000000000   | 1961        |
| 337         | 581         | 2777.8000000000000000  | 4060        |
| 338         | -419        | 1655.2307692307692308  | 3871        |
| 339         | -780        | 1591.0000000000000000  | 3775        |
| 340         | 56          | 2667.6842105263157895  | 6048        |
| 341         | 279         | 1043.1111111111111111  | 1930        |
| 342         | -345        | 1197.8181818181818182  | 2907        |
| 343         | 859         | 2813.4615384615384615  | 4989        |
| 344         | 816         | 4909.7619047619047619  | 8793        |
| 345         | -2288       | -877.1428571428571429  | -100        |
| 346         | 916         | 3812.5000000000000000  | 5834        |
| 347         | 394         | 1225.3000000000000000  | 1825        |
| 348         | -771        | 630.7777777777777778   | 1829        |
| 349         | -408        | 2737.5625000000000000  | 6460        |
| 350         | 167         | 2180.6111111111111111  | 3026        |
| 351         | 739         | 1772.1111111111111111  | 2638        |
| 352         | 366         | 925.5555555555555556   | 1602        |
| 353         | -878        | 472.6000000000000000   | 2110        |
| 354         | 158         | 490.0000000000000000   | 822         |
| 355         | -1137       | -112.2857142857142857  | 522         |
| 356         | 367         | 2116.7777777777777778  | 4338        |
| 357         | 780         | 1274.6666666666666667  | 2216        |
| 358         | -453        | 870.5555555555555556   | 1931        |
| 359         | 10          | 2021.8181818181818182  | 3909        |
| 360         | 385         | 3807.0000000000000000  | 6682        |
| 361         | 1254        | 1389.2500000000000000  | 1686        |
| 362         | -416        | 307.6666666666666667   | 763         |
| 363         | 426         | 1173.3846153846153846  | 2480        |
| 364         | 563         | 2788.2777777777777778  | 6417        |
| 365         | 595         | 2507.3571428571428571  | 4041        |
| 366         | 257         | 3696.7142857142857143  | 5522        |
| 367         | -454        | 2508.4666666666666667  | 5567        |
| 368         | 100         | 2901.6000000000000000  | 5381        |
| 369         | 376         | 1324.0000000000000000  | 2415        |
| 370         | 202         | 1973.3125000000000000  | 3622        |
| 371         | -819        | 569.8571428571428571   | 2163        |
| 372         | 920         | 4251.8571428571428571  | 6670        |
| 373         | 277         | 1110.1428571428571429  | 2326        |
| 374         | -891        | 1454.0000000000000000  | 3454        |
| 375         | 647         | 2150.0000000000000000  | 3421        |
| 376         | 229         | 4390.3333333333333333  | 9200        |
| 377         | 637         | 1446.8750000000000000  | 2839        |
| 378         | 7           | 2103.3076923076923077  | 4167        |
| 379         | -478        | 322.0000000000000000   | 933         |
| 380         | -245        | 552.8750000000000000   | 1995        |
| 381         | 7           | 950.8888888888888889   | 2413        |
| 382         | -372        | 1376.1428571428571429  | 3209        |
| 383         | 889         | 3148.6363636363636364  | 5333        |
| 384         | -986        | 524.3750000000000000   | 1445        |
| 385         | -1323       | -97.7272727272727273   | 760         |
| 386         | 97          | 828.7142857142857143   | 1784        |
| 387         | 180         | 2078.2857142857142857  | 3359        |
| 388         | 833         | 1923.4285714285714286  | 2579        |
| 389         | 632         | 2747.5384615384615385  | 4459        |
| 390         | -157        | 715.6000000000000000   | 1744        |
| 391         | -577        | 448.9166666666666667   | 1392        |
| 392         | 936         | 2165.3333333333333333  | 3211        |
| 393         | 82          | 2281.9375000000000000  | 4478        |
| 394         | 1762        | 2779.5000000000000000  | 4456        |
| 395         | -1103       | 223.4545454545454545   | 1458        |
| 396         | 942         | 2731.6111111111111111  | 4154        |
| 397         | 973         | 1392.5000000000000000  | 1782        |
| 398         | -1807       | -208.2000000000000000  | 953         |
| 399         | -32         | 1344.4444444444444444  | 3097        |
| 400         | 691         | 1513.2857142857142857  | 2894        |
| 401         | 956         | 1566.0000000000000000  | 2045        |
| 402         | 435         | 1271.0000000000000000  | 1898        |
| 403         | 232         | 1235.4285714285714286  | 2203        |
| 404         | 1360        | 2557.1904761904761905  | 4473        |
| 405         | -1978       | -258.6666666666666667  | 1659        |
| 406         | 795         | 3204.0666666666666667  | 5913        |
| 407         | 259         | 1472.4444444444444444  | 2634        |
| 408         | 514         | 1247.7500000000000000  | 2118        |
| 409         | 155         | 3029.6923076923076923  | 6259        |
| 410         | 430         | 1633.0000000000000000  | 2882        |
| 411         | -981        | -250.0000000000000000  | 551         |
| 412         | 139         | 519.5000000000000000   | 836         |
| 413         | 927         | 3410.8888888888888889  | 5350        |
| 414         | 445         | 1764.6666666666666667  | 3352        |
| 415         | -2221       | -759.4285714285714286  | 718         |
| 416         | 756         | 5635.0526315789473684  | 7925        |
| 417         | -1207       | 257.5333333333333333   | 2022        |
| 418         | 261         | 2564.1052631578947368  | 5062        |
| 419         | -846        | 415.4000000000000000   | 1627        |
| 420         | -1784       | -671.6000000000000000  | 476         |
| 421         | -741        | 151.3750000000000000   | 1094        |
| 422         | -599        | 1265.2857142857142857  | 2486        |
| 423         | -636        | 127.0000000000000000   | 1321        |
| 424         | -595        | 1257.5000000000000000  | 3139        |
| 425         | 63          | 698.1538461538461538   | 1370        |
| 426         | -3056       | -2043.5882352941176471 | 282         |
| 427         | 588         | 2626.9166666666666667  | 4548        |
| 428         | -260        | 363.1666666666666667   | 1217        |
| 429         | -46         | 856.6250000000000000   | 2031        |
| 430         | 829         | 1787.5714285714285714  | 3045        |
| 431         | -1139       | -294.7500000000000000  | 259         |
| 432         | -180        | 3644.5000000000000000  | 5870        |
| 433         | 142         | 1051.2857142857142857  | 1912        |
| 434         | 686         | 2460.3684210526315789  | 3802        |
| 435         | -151        | 2885.4545454545454545  | 5648        |
| 436         | 401         | 1002.4285714285714286  | 1747        |
| 437         | 1129        | 1634.1111111111111111  | 2231        |
| 438         | 261         | 2817.6666666666666667  | 5418        |
| 439         | 430         | 1344.2500000000000000  | 2150        |
| 440         | 45          | 623.0000000000000000   | 1308        |
| 441         | 418         | 2182.8095238095238095  | 2868        |
| 442         | -1864       | 53.1428571428571429    | 2425        |
| 443         | 760         | 1168.4444444444444444  | 2008        |
| 444         | 69          | 1793.8000000000000000  | 3658        |
| 445         | 853         | 2401.2941176470588235  | 4754        |
| 446         | 412         | 1340.2500000000000000  | 2079        |
| 447         | 188         | 2651.0000000000000000  | 5042        |
| 448         | 759         | 3715.5238095238095238  | 6114        |
| 449         | -642        | 639.8461538461538462   | 2503        |
| 450         | 890         | 2366.5714285714285714  | 3728        |
| 451         | 57          | 1692.0000000000000000  | 3408        |
| 452         | 441         | 1961.1111111111111111  | 3156        |
| 453         | 44          | 666.7272727272727273   | 1625        |
| 454         | 11          | 1927.0714285714285714  | 3126        |
| 455         | 329         | 1029.3333333333333333  | 1543        |
| 456         | 753         | 4425.5789473684210526  | 6269        |
| 457         | 657         | 1781.1000000000000000  | 2737        |
| 458         | 715         | 1472.6666666666666667  | 2083        |
| 459         | -90         | 715.0769230769230769   | 1385        |
| 460         | 80          | 1460.7777777777777778  | 2571        |
| 461         | 1628        | 3068.0833333333333333  | 4773        |
| 462         | 720         | 2709.7142857142857143  | 6205        |
| 463         | 406         | 2748.5384615384615385  | 4889        |
| 464         | 216         | 678.0000000000000000   | 1199        |
| 465         | 955         | 2514.3750000000000000  | 3589        |
| 466         | -768        | 101.0000000000000000   | 703         |
| 467         | 738         | 4396.0454545454545455  | 7844        |
| 468         | -865        | -154.7142857142857143  | 939         |
| 469         | 297         | 2743.3333333333333333  | 4505        |
| 470         | 942         | 1548.0000000000000000  | 2195        |
| 471         | 781         | 1214.6000000000000000  | 1887        |
| 472         | 495         | 2017.3333333333333333  | 3745        |
| 473         | -402        | 506.9411764705882353   | 1568        |
| 474         | 928         | 1586.6666666666666667  | 2115        |
| 475         | 552         | 4256.8500000000000000  | 6982        |
| 476         | -589        | 820.9000000000000000   | 2122        |
| 477         | -108        | 2124.7058823529411765  | 4337        |
| 478         | -696        | 1409.0833333333333333  | 3463        |
| 479         | -327        | 168.6666666666666667   | 513         |
| 480         | -235        | 58.0000000000000000    | 522         |
| 481         | -1354       | -246.8333333333333333  | 1366        |
| 482         | 674         | 2833.9166666666666667  | 4078        |
| 483         | 481         | 3979.4666666666666667  | 8056        |
| 484         | 871         | 1235.3333333333333333  | 1908        |
| 485         | 16          | 1752.2857142857142857  | 3806        |
| 486         | -134        | 889.3333333333333333   | 2224        |
| 487         | -572        | 645.0666666666666667   | 1938        |
| 488         | 304         | 1334.8333333333333333  | 2321        |
| 489         | 498         | 3242.9411764705882353  | 5628        |
| 490         | 24          | 338.7500000000000000   | 718         |
| 491         | 18          | 3038.7857142857142857  | 5664        |
| 492         | -1018       | 417.2857142857142857   | 1947        |
| 493         | 845         | 2498.5714285714285714  | 4610        |
| 494         | 529         | 1211.0000000000000000  | 2019        |
| 495         | -676        | 173.2857142857142857   | 1435        |
| 496         | 47          | 956.5000000000000000   | 1942        |
| 497         | 463         | 1553.3333333333333333  | 2681        |
| 498         | 774         | 2220.2222222222222222  | 3488        |
| 499         | 147         | 3415.8235294117647059  | 5245        |
| 500         | 1136        | 3685.1875000000000000  | 6131        |

---

[View on DB Fiddle](https://www.db-fiddle.com/f/2GtQz4wZtuNNu7zXH5HtV4/3)
