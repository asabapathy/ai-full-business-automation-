terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
  backend "s3" {
    bucket         = "kanavu-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "kanavu-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = { Project = "kanavu", Environment = "production", ManagedBy = "terraform" } }
}

variable "aws_region"   { type = string; default = "us-east-1" }
variable "db_password"  { type = string; sensitive = true }

module "vpc" {
  source             = "../../modules/vpc"
  environment        = "production"
  vpc_cidr           = "10.1.0.0/16"
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
}

module "rds" {
  source              = "../../modules/rds"
  environment         = "production"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  db_password         = var.db_password
  instance_class      = "db.r7g.large"
  allocated_storage   = 100
  max_allocated_storage = 500
  multi_az            = true
  deletion_protection = true
  backup_retention    = 14
  allowed_cidr_blocks = [module.vpc.vpc_cidr]
}

module "elasticache" {
  source              = "../../modules/elasticache"
  environment         = "production"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  node_type           = "cache.r7g.large"
  num_cache_nodes     = 2
  allowed_cidr_blocks = [module.vpc.vpc_cidr]
}

module "s3_assets" {
  source        = "../../modules/s3"
  environment   = "production"
  bucket_suffix = "assets"
}

module "s3_backups" {
  source          = "../../modules/s3"
  environment     = "production"
  bucket_suffix   = "backups"
  versioning      = true
  expiration_days = 90
}

module "eks" {
  source             = "../../modules/eks"
  environment        = "production"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  kubernetes_version = "1.30"
  node_instance_type = "t3.xlarge"
  node_min_size      = 2
  node_max_size      = 10
  node_desired_size  = 3
  disk_size          = 50
}

output "rds_endpoint"    { value = module.rds.endpoint; sensitive = true }
output "redis_endpoint"  { value = module.elasticache.primary_endpoint; sensitive = true }
output "eks_cluster"     { value = module.eks.cluster_name }
output "s3_assets"       { value = module.s3_assets.bucket_id }
output "s3_backups"      { value = module.s3_backups.bucket_id }
