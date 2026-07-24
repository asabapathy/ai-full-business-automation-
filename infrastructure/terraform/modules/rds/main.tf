variable "environment"         { type = string }
variable "project"             { type = string; default = "kanavu" }
variable "vpc_id"              { type = string }
variable "subnet_ids"          { type = list(string) }
variable "db_name"             { type = string; default = "kanavu" }
variable "db_username"         { type = string; default = "kanavu_admin" }
variable "db_password"         { type = string; sensitive = true }
variable "instance_class"      { type = string; default = "db.t4g.small" }
variable "allocated_storage"   { type = number; default = 20 }
variable "max_allocated_storage" { type = number; default = 100 }
variable "allowed_cidr_blocks" { type = list(string) }
variable "multi_az"            { type = bool; default = false }
variable "deletion_protection" { type = bool; default = true }
variable "backup_retention"    { type = number; default = 7 }

resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.environment}-rds-sg"
  description = "RDS PostgreSQL security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }
  tags = { Name = "${var.project}-${var.environment}-rds-sg" }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet"
  subnet_ids = var.subnet_ids
  tags       = { Name = "${var.project}-${var.environment}-db-subnet" }
}

resource "aws_db_parameter_group" "main" {
  family = "postgres16"
  name   = "${var.project}-${var.environment}-pg16"
  parameter { name = "log_min_duration_statement"; value = "1000" }
  parameter { name = "shared_preload_libraries"; value = "pg_stat_statements" }
}

resource "aws_db_instance" "main" {
  identifier              = "${var.project}-${var.environment}-db"
  engine                  = "postgres"
  engine_version          = "16.3"
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  max_allocated_storage   = var.max_allocated_storage
  storage_encrypted       = true
  db_name                 = var.db_name
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.main.name
  multi_az                = var.multi_az
  backup_retention_period = var.backup_retention
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${var.project}-${var.environment}-final-snapshot" : null
  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  tags = { Name = "${var.project}-${var.environment}-db", Environment = var.environment }
}

output "endpoint"    { value = aws_db_instance.main.endpoint }
output "db_name"     { value = aws_db_instance.main.db_name }
output "host"        { value = aws_db_instance.main.address }
output "port"        { value = aws_db_instance.main.port }
output "sg_id"       { value = aws_security_group.rds.id }
