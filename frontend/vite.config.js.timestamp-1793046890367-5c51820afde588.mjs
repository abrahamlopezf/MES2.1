// vite.config.js
import { defineConfig } from "file:///C:/Users/maicr/OneDrive/Desktop/Demo/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/maicr/OneDrive/Desktop/Demo/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/maicr/OneDrive/Desktop/Demo/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
      "@app": path.resolve(process.cwd(), "./src/app"),
      "@core": path.resolve(process.cwd(), "./src/core"),
      "@shared": path.resolve(process.cwd(), "./src/shared"),
      "@modules": path.resolve(process.cwd(), "./src/modules")
    },
    extensions: [".mjs", ".js", ".mts", ".ts", ".tsx", ".jsx", ".json"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtYWljclxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXERlbW9cXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXG1haWNyXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcRGVtb1xcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvbWFpY3IvT25lRHJpdmUvRGVza3RvcC9EZW1vL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICB0YWlsd2luZGNzcygpLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuL3NyYycpLFxuICAgICAgJ0BhcHAnOiBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy4vc3JjL2FwcCcpLFxuICAgICAgJ0Bjb3JlJzogcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuL3NyYy9jb3JlJyksXG4gICAgICAnQHNoYXJlZCc6IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLi9zcmMvc2hhcmVkJyksXG4gICAgICAnQG1vZHVsZXMnOiBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy4vc3JjL21vZHVsZXMnKSxcbiAgICB9LFxuICAgIGV4dGVuc2lvbnM6IFsnLm1qcycsICcuanMnLCAnLm10cycsICcudHMnLCAnLnRzeCcsICcuanN4JywgJy5qc29uJ11cbiAgfSxcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVUsU0FBUyxvQkFBb0I7QUFDcFcsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sVUFBVTtBQUVqQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsRUFDZDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsUUFBUSxJQUFJLEdBQUcsT0FBTztBQUFBLE1BQ3hDLFFBQVEsS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLFdBQVc7QUFBQSxNQUMvQyxTQUFTLEtBQUssUUFBUSxRQUFRLElBQUksR0FBRyxZQUFZO0FBQUEsTUFDakQsV0FBVyxLQUFLLFFBQVEsUUFBUSxJQUFJLEdBQUcsY0FBYztBQUFBLE1BQ3JELFlBQVksS0FBSyxRQUFRLFFBQVEsSUFBSSxHQUFHLGVBQWU7QUFBQSxJQUN6RDtBQUFBLElBQ0EsWUFBWSxDQUFDLFFBQVEsT0FBTyxRQUFRLE9BQU8sUUFBUSxRQUFRLE9BQU87QUFBQSxFQUNwRTtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
