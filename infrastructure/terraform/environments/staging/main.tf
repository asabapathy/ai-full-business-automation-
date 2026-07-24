terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws"; version = "~> 5.0" }
  }
  backend "s3" {
    bucket  = "kanavu-terraform-state"
    key     = "staging/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = { Project = "kanavu", Environment = "staging", ManagedBy = "terraform" } }
}

variable "aws_region"   { type = string; default = "us-east-1" }
variable "db_password"  { type = string; sensitive = true }

module "vpc" {
  source             = "../../modules/vpc"
  environment        = "staging"
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

module "rds" {
  source              = "../../modules/rds"
  environment         = "staging"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  db_password         = var.db_password
  instance_class      = "db.t4g.small"
  allocated_storage   = 20
  multi_az            = false
  deletion_protection = false
  backup_retention    = 3
  allowed_cidr_blocks = [module.vpc.vpc_cidr]
}

module "elasticache" {
  source              = "../../modules/elasticache"
  environment         = "staging"
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  node_type           = "cache.t4g.micro"
  allowed_cidr_blocks = [module.vpc.vpc_cidr]
}

module "s3_assets" {
  source       = "../../modules/s3"
  environment  = "staging"
  bucket_suffix = "assets"
}

module "eks" {
  source             = "../../modules/eks"
  environment        = "staging"
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  node_instance_type = "t3.medium"
  node_min_size      = 1
  node_max_size      = 3
  node_desired_size  = 2
}

output "rds_endpoint"    { value = module.rds.endpoint; sensitive = true }
output "redis_endpoint"  { value = module.elasticache.primary_endpoint; sensitive = true }
output "eks_cluster"     { value = module.eks.cluster_name }
output "s3_bucket"       { value = module.s3_assets.bucket_id }
