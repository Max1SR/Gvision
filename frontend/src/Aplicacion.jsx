import React from "react";
import { createRoot } from "react-dom/client";
import AuthScreen from "./AuthScreen"; 
import "./styles.css";


const contenedorHtml = document.getElementById("contenedor");
const root = createRoot(contenedorHtml);


root.render(<AuthScreen />);
