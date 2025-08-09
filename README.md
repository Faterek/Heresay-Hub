# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## Docker Deployment

### Using Pre-built Images

Docker images are automatically built and published to GitHub Container Registry on every push to the main branch. You can use these images directly:

```bash
# Pull the latest image
docker pull ghcr.io/faterek/heresay-hub:latest

# Run with required environment variables
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e NEXTAUTH_SECRET="your_secret" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  --name heresay-hub \
  ghcr.io/faterek/heresay-hub:latest
```

### Available Tags

- `latest` - Latest build from the main branch
- `master` - Latest build from the master branch
- `v*` - Semantic version tags (e.g., `v1.0.0`)
- `master-<sha>` - Specific commit builds

### Building Locally

```bash
# Build the image
docker build -t heresay-hub .

# Run locally
docker run -d -p 3000:3000 --env-file .env.local heresay-hub
```

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
