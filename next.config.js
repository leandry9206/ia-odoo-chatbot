/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Permite que el widget se embeba dentro de tu sitio Odoo vía <iframe>.
  // Ajusta el dominio a tu web real en producción.
  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.tudominio.com",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
