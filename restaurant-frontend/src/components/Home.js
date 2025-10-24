import React from "react";
import { Link } from "react-router-dom";
import bestDishes from "../data/bestDishes";
import "./Home.css";

const Home = () => {
  return (
    <div className="home-container">
      <section className="hero">
        <img src="logo.png" className="logo3" alt="Logo" />
        <h1>Welcome to <span className="highlight">Gourmet Haven</span></h1>
        <p className="subtitle">Indulge in a world-class dining experience. Order from your table and let us serve you the best.</p>
        <p className="tagline">“Great food, great mood — right at your table.”</p>
        <div className="buttons">
          <Link to="/menu" className="btn btn-primary">View Menu</Link>
          <Link to="/orders" className="btn btn-secondary">Track Order</Link>
        </div>
      </section>

      <section className="best-dishes">
        <h2>Best Selling Dishes</h2>
        <div className="carousel">
          {bestDishes.map((dish) => (
            <div key={dish.id} className="dish-card">
              <img src={dish.image} alt={dish.name} />
              <h3>{dish.name}</h3>
              <p>{dish.price}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;