# Docker Bake configuration for Restaunax
# Enables parallel builds and advanced BuildKit features

variable "REGISTRY" {
  default = "restaunax"
}

variable "TAG" {
  default = "latest"
}

variable "PLATFORM" {
  default = "linux/amd64"
}

# Define common configurations
function "common" {
  params = []
  result = {
    platforms = [PLATFORM]
    pull = true
  }
}

# Development targets
group "dev" {
  targets = ["client-dev", "server-dev"]
}

# Production targets
group "prod" {
  targets = ["client-prod", "server-prod"]
}

# All targets
group "all" {
  targets = ["client-dev", "client-prod", "server-dev", "server-prod"]
}

# Client development build
target "client-dev" {
  name = "client-dev"
  inherits = ["common"]
  context = "./client"
  dockerfile = "../docker/client/Dockerfile"
  target = "development"
  tags = ["${REGISTRY}/client:dev-${TAG}"]
  cache-from = [
    "type=registry,ref=${REGISTRY}/client:buildcache-dev"
  ]
  cache-to = [
    "type=registry,ref=${REGISTRY}/client:buildcache-dev,mode=max"
  ]
}

# Client production build
target "client-prod" {
  name = "client-prod"
  inherits = ["common"]
  context = "./client"
  dockerfile = "../docker/client/Dockerfile"
  target = "production"
  tags = ["${REGISTRY}/client:prod-${TAG}"]
  cache-from = [
    "type=registry,ref=${REGISTRY}/client:buildcache-prod"
  ]
  cache-to = [
    "type=registry,ref=${REGISTRY}/client:buildcache-prod,mode=max"
  ]
}

# Server development build
target "server-dev" {
  name = "server-dev"
  inherits = ["common"]
  context = "./server"
  dockerfile = "../docker/server/Dockerfile"
  target = "development"
  tags = ["${REGISTRY}/server:dev-${TAG}"]
  cache-from = [
    "type=registry,ref=${REGISTRY}/server:buildcache-dev"
  ]
  cache-to = [
    "type=registry,ref=${REGISTRY}/server:buildcache-dev,mode=max"
  ]
}

# Server production build
target "server-prod" {
  name = "server-prod"
  inherits = ["common"]
  context = "./server"
  dockerfile = "../docker/server/Dockerfile"
  target = "production"
  tags = ["${REGISTRY}/server:prod-${TAG}"]
  cache-from = [
    "type=registry,ref=${REGISTRY}/server:buildcache-prod"
  ]
  cache-to = [
    "type=registry,ref=${REGISTRY}/server:buildcache-prod,mode=max"
  ]
}