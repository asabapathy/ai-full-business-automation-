variable "environment"       { type = string }
variable "project"           { type = string; default = "kanavu" }
variable "bucket_suffix"     { type = string; default = "" }
variable "versioning"        { type = bool; default = true }
variable "cors_origins"      { type = list(string); default = ["*"] }
variable "expiration_days"   { type = number; default = 0 }

locals {
  bucket_name = var.bucket_suffix != "" ? "${var.project}-${var.environment}-${var.bucket_suffix}" : "${var.project}-${var.environment}-assets-${random_id.suffix.hex}"
}

resource "random_id" "suffix" { byte_length = 4 }

resource "aws_s3_bucket" "main" {
  bucket = local.bucket_name
  tags   = { Name = local.bucket_name, Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration { status = var.versioning ? "Enabled" : "Disabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket                  = aws_s3_bucket.main.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_cors_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_origins
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count  = var.expiration_days > 0 ? 1 : 0
  bucket = aws_s3_bucket.main.id
  rule {
    id     = "expire-old-objects"
    status = "Enabled"
    filter {}
    expiration { days = var.expiration_days }
    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.main.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.main.arn}/*"
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.main]
}

output "bucket_id"           { value = aws_s3_bucket.main.id }
output "bucket_arn"          { value = aws_s3_bucket.main.arn }
output "bucket_domain_name"  { value = aws_s3_bucket.main.bucket_domain_name }
output "bucket_regional_domain_name" { value = aws_s3_bucket.main.bucket_regional_domain_name }
