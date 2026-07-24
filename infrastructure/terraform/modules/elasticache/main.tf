variable "environment"         { type = string }
variable "project"             { type = string; default = "kanavu" }
variable "vpc_id"              { type = string }
variable "subnet_ids"          { type = list(string) }
variable "node_type"           { type = string; default = "cache.t4g.small" }
variable "num_cache_nodes"     { type = number; default = 1 }
variable "allowed_cidr_blocks" { type = list(string) }
variable "engine_version"      { type = string; default = "7.1" }

resource "aws_security_group" "redis" {
  name        = "${var.project}-${var.environment}-redis-sg"
  description = "ElastiCache Redis security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }
  tags = { Name = "${var.project}-${var.environment}-redis-sg" }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-cache-subnet"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_parameter_group" "main" {
  family = "redis7"
  name   = "${var.project}-${var.environment}-redis7"
  parameter { name = "maxmemory-policy"; value = "allkeys-lru" }
  parameter { name = "lazyfree-lazy-eviction"; value = "yes" }
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id        = "${var.project}-${var.environment}-redis"
  description                 = "Redis for ${var.project} ${var.environment}"
  node_type                   = var.node_type
  num_cache_clusters          = var.num_cache_nodes
  parameter_group_name        = aws_elasticache_parameter_group.main.name
  subnet_group_name           = aws_elasticache_subnet_group.main.name
  security_group_ids          = [aws_security_group.redis.id]
  engine_version              = var.engine_version
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  automatic_failover_enabled  = var.num_cache_nodes > 1
  auto_minor_version_upgrade  = true
  maintenance_window          = "sun:05:00-sun:06:00"
  snapshot_window             = "04:00-05:00"
  snapshot_retention_limit    = 3
  tags = { Name = "${var.project}-${var.environment}-redis", Environment = var.environment }
}

output "primary_endpoint"    { value = aws_elasticache_replication_group.main.primary_endpoint_address }
output "reader_endpoint"     { value = aws_elasticache_replication_group.main.reader_endpoint_address }
output "port"                { value = 6379 }
output "connection_string"   { value = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379" }
