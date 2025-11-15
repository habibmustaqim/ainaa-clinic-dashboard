import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
import io

# ---------------------------
# Theme colors
# ---------------------------
MAIN = "#26396A"     # deep navy
ACCENT = "#2D9963"   # green accent
BG = "#F8FAFC"       # soft bg

st.set_page_config(page_title="Ainaa Dashboard", layout="wide")

# ---------------------------
# Custom CSS for clean UI
# ---------------------------
st.markdown(f"""
<style>
:root {{
  --main: {MAIN};
  --accent: {ACCENT};
}}
body {{
  background-color: {BG};
  font-family: 'Inter', sans-serif;
}}
.sidebar .sidebar-content {{
  background: linear-gradient(180deg, var(--main), var(--accent));
  color: white !important;
}}
h1, h2, h3, h4 {{
  color: var(--main);
}}
div.block-container {{
  padding-top: 2rem;
  padding-bottom: 2rem;
  max-width: 1400px;
}}
.card {{
  background: white;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  border: 1px solid #e5e7eb;
}}
.metric {{
  text-align: center;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}}
.metric h3 {{
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 6px;
}}
.metric span {{
  font-size: 20px;
  color: var(--main);
  font-weight: 700;
}}
.customer-card {{
  display: flex;
  align-items: center;
  gap: 20px;
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}}
.customer-card img {{
  border-radius: 15px;
  width: 130px;
  height: 130px;
  object-fit: cover;
}}
.customer-info h2 {{
  margin: 0;
  color: var(--main);
}}
.customer-info p {{
  margin: 2px 0;
  color: #4b5563;
}}
</style>
""", unsafe_allow_html=True)

# ---------------------------
# Sidebar
# ---------------------------
with st.sidebar:
    st.image("https://ainaabeauty.com/wp-content/uploads/2023/05/Ainaa-Logo-White.png", use_container_width=True)
    st.markdown("### Navigation")
    page = st.radio("", ["🏠 Home", "📋 All Sales", "👩‍💼 Customer Profile", "📦 Products"])
    st.markdown("---")
    uploaded = st.file_uploader("Upload Sales CSV", type=["csv"])

# ---------------------------
# Load Data
# ---------------------------
def try_read_csv(file):
    content = file.getvalue().decode("utf-8", errors="ignore")
    for sep in [",", "\t", ";"]:
        try:
            df = pd.read_csv(io.StringIO(content), sep=sep)
            if df.shape[1] > 1:
                return df
        except Exception:
            pass
    return pd.DataFrame()

if uploaded:
    df = try_read_csv(uploaded)
    st.session_state["df"] = df
else:
    df = st.session_state.get("df")

# ---------------------------
# Dashboard Pages
# ---------------------------
if uploaded or df is not None:
    if page == "🏠 Home":
        st.title("📊 Ainaa Sales Overview")
        if df.empty:
            st.warning("Upload CSV untuk mula analisis.")
        else:
            # Assume ada column Date, Customer, Amount
            cols = df.columns
            date_col = [c for c in cols if "date" in c.lower()][0]
            cust_col = [c for c in cols if "name" in c.lower() or "customer" in c.lower()][0]
            amt_col = [c for c in cols if "total" in c.lower() or "amount" in c.lower()][0]

            df[date_col] = pd.to_datetime(df[date_col], errors='coerce', dayfirst=True)
            df[amt_col] = pd.to_numeric(df[amt_col], errors='coerce').fillna(0)

            total_sales = df[amt_col].sum()
            total_orders = len(df)
            total_customers = df[cust_col].nunique()
            avg_order = total_sales / total_orders if total_orders else 0

            c1, c2, c3, c4 = st.columns(4)
            with c1: st.markdown(f"<div class='metric'><h3>Total Sales</h3><span>RM {total_sales:,.2f}</span></div>", unsafe_allow_html=True)
            with c2: st.markdown(f"<div class='metric'><h3>Total Orders</h3><span>{total_orders}</span></div>", unsafe_allow_html=True)
            with c3: st.markdown(f"<div class='metric'><h3>Customers</h3><span>{total_customers}</span></div>", unsafe_allow_html=True)
            with c4: st.markdown(f"<div class='metric'><h3>Avg Order</h3><span>RM {avg_order:,.2f}</span></div>", unsafe_allow_html=True)

            st.markdown("### Sales Trend")
            trend = df.groupby(date_col)[amt_col].sum().reset_index()
            fig = px.line(trend, x=date_col, y=amt_col, markers=True)
            fig.update_traces(line_color=MAIN)
            st.plotly_chart(fig, use_container_width=True)

            st.markdown("### Top 10 Customers")
            top = df.groupby(cust_col)[amt_col].sum().sort_values(ascending=False).head(10).reset_index()
            fig2 = px.bar(top, x=cust_col, y=amt_col, color_discrete_sequence=[ACCENT])
            st.plotly_chart(fig2, use_container_width=True)

    elif page == "👩‍💼 Customer Profile":
        st.title("👩‍💼 Customer Profile")
        if df.empty:
            st.warning("Upload CSV untuk mula.")
        else:
            cust_col = [c for c in df.columns if "name" in c.lower() or "customer" in c.lower()][0]
            amt_col = [c for c in df.columns if "total" in c.lower() or "amount" in c.lower()][0]
            date_col = [c for c in df.columns if "date" in c.lower()][0]
            df[amt_col] = pd.to_numeric(df[amt_col], errors='coerce').fillna(0)
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce', dayfirst=True)

            selected = st.selectbox("Pilih Customer", sorted(df[cust_col].unique()))
            data = df[df[cust_col] == selected]

            total_spend = data[amt_col].sum()
            last_purchase = data[date_col].max()
            avg_order = total_spend / len(data) if len(data) else 0

            st.markdown(f"""
            <div class='customer-card'>
                <img src="https://ui-avatars.com/api/?name={selected.replace(' ','+')}&background=26396A&color=fff" />
                <div class='customer-info'>
                    <h2>{selected}</h2>
                    <p>Total Spend: <b>RM {total_spend:,.2f}</b></p>
                    <p>Orders: <b>{len(data)}</b></p>
                    <p>Avg Order: <b>RM {avg_order:,.2f}</b></p>
                    <p>Last Purchase: <b>{last_purchase.date()}</b></p>
                </div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown("### Order History")
            st.dataframe(data.sort_values(date_col, ascending=False))

            st.markdown("### Spending Trend")
            trend = data.groupby(date_col)[amt_col].sum().reset_index()
            fig = px.line(trend, x=date_col, y=amt_col, markers=True, color_discrete_sequence=[ACCENT])
            st.plotly_chart(fig, use_container_width=True)

    elif page == "📋 All Sales":
        st.title("📋 All Sales")
        st.dataframe(df)

    elif page == "📦 Products":
        st.title("📦 Top Products (if available)")
        prod_col = [c for c in df.columns if "product" in c.lower() or "item" in c.lower()]
        if prod_col:
            prod = prod_col[0]
            amt_col = [c for c in df.columns if "total" in c.lower() or "amount" in c.lower()][0]
            top_p = df.groupby(prod)[amt_col].sum().reset_index().sort_values(amt_col, ascending=False).head(20)
            fig = px.bar(top_p, x=prod, y=amt_col, color_discrete_sequence=[ACCENT])
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Tiada column produk dalam fail CSV ni.")
else:
    st.info("Upload CSV untuk mula guna dashboard.")