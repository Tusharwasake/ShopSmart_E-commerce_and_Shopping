# PowerShell script to set up the Node.js Express backend structure

# Define project structure
$folders = @(
    "src",
    "src/config",
    "src/controllers",
    "src/middlewares",
    "src/models",
    "src/routes",
    "src/services",
    "src/utils",
    "tests",
    "public"
)

# Define files to create
$files = @(
    "src/config/db.js",
    "src/config/corsOptions.js",
    "src/controllers/authController.js",
    "src/controllers/eventController.js",
    "src/controllers/userController.js",
    "src/middlewares/authMiddleware.js",
    "src/middlewares/errorHandler.js",
    "src/models/User.js",
    "src/models/Event.js",
    "src/routes/authRoutes.js",
    "src/routes/eventRoutes.js",
    "src/routes/userRoutes.js",
    "src/services/authService.js",
    "src/services/emailService.js",
    "src/utils/jwt.js",
    "src/utils/passwordHash.js",
    "src/app.js",
    "src/server.js",
    "tests/auth.test.js",
    "tests/event.test.js",
    "tests/user.test.js",
    ".gitignore",
    ".env",
    "README.md"
)

# Create folders
foreach ($folder in $folders) {
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
    }
}

# Create files
foreach ($file in $files) {
    if (-Not (Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
    }
}

# Initialize npm and install dependencies
npm init -y
npm install express cors mongoose dotenv bcryptjs jsonwebtoken nodemon

# Create package.json scripts for easy startup
$json = Get-Content package.json | ConvertFrom-Json
$json.scripts.start = "node src/server.js"
$json.scripts.dev = "nodemon src/server.js"
$json | ConvertTo-Json -Depth 100 | Set-Content package.json

Write-Host "✅ Project setup completed!"
