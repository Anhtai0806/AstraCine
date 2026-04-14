import React from "react";
import priceImg from "../../assets/price.jpg";

export default function PricePage() {
    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px"
        }}>
            <img 
                src={priceImg} 
                alt="Bảng giá vé"
                style={{
                    width: "600px",
                    maxWidth: "100%",
                    borderRadius: "12px",
                    boxShadow: "0 0 20px rgba(0,0,0,0.5)"
                }}
            />
        </div>
    );
}