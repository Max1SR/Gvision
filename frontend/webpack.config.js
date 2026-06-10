const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: "development",
  entry: "./src/Aplicacion.jsx",
  output: {
    // La banda transportadora deja los archivos terminados en el backend
    path: path.resolve(__dirname, "../backend/public"),
    filename: "main.js",
    clean: true, // Limpia la carpeta public antes de cada compilación
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./plantilla/index.html", // Toma la caja vacía
      filename: "index.html", // Entrega la caja llena en backend/public
    }),
  ],
  module: {
    rules: [
      // Regla para React y Javascript moderno
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      // NUEVA REGLA: Procesamiento de CSS y Tailwind
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      // Regla imagen
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      // Regla audio y video
      {
        test: /\.(mp3|wav|ogg|mp4)$/i,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".js", ".jsx"], 
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "../backend/public"),
    },
    port: 8080,
    open: true,
    hot: true,
    historyApiFallback: true,
  },
};
