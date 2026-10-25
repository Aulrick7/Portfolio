/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        stackbitPreview: process.env.STACKBIT_PREVIEW
    },
    trailingSlash: true,
    reactStrictMode: true,
    // The old list pages were replaced by the 3D grids; send old links (CV, LinkedIn, bookmarks) there.
    async redirects() {
        return [
            { source: '/projects', destination: '/projectChoice/', permanent: false },
            { source: '/workXP', destination: '/experienceChoice/', permanent: false }
        ];
    }
};

module.exports = nextConfig;
