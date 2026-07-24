variable "environment"          { type = string }
variable "project"              { type = string; default = "kanavu" }
variable "vpc_id"               { type = string }
variable "subnet_ids"           { type = list(string) }
variable "kubernetes_version"   { type = string; default = "1.30" }
variable "node_instance_type"   { type = string; default = "t3.medium" }
variable "node_min_size"        { type = number; default = 1 }
variable "node_max_size"        { type = number; default = 5 }
variable "node_desired_size"    { type = number; default = 2 }
variable "disk_size"            { type = number; default = 20 }

data "aws_iam_policy_document" "eks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["eks.amazonaws.com"] }
  }
}

resource "aws_iam_role" "cluster" {
  name               = "${var.project}-${var.environment}-eks-cluster-role"
  assume_role_policy = data.aws_iam_policy_document.eks_assume.json
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_security_group" "cluster" {
  name        = "${var.project}-${var.environment}-eks-cluster-sg"
  description = "EKS cluster security group"
  vpc_id      = var.vpc_id
  egress { from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"] }
  tags = { Name = "${var.project}-${var.environment}-eks-cluster-sg" }
}

resource "aws_eks_cluster" "main" {
  name     = "${var.project}-${var.environment}"
  role_arn = aws_iam_role.cluster.arn
  version  = var.kubernetes_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    security_group_ids      = [aws_security_group.cluster.id]
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  depends_on = [aws_iam_role_policy_attachment.cluster_policy]
  tags = { Environment = var.environment }
}

data "aws_iam_policy_document" "node_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals { type = "Service"; identifiers = ["ec2.amazonaws.com"] }
  }
}

resource "aws_iam_role" "nodes" {
  name               = "${var.project}-${var.environment}-eks-nodes-role"
  assume_role_policy = data.aws_iam_policy_document.node_assume.json
}

resource "aws_iam_role_policy_attachment" "nodes_worker" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.nodes.name
}
resource "aws_iam_role_policy_attachment" "nodes_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.nodes.name
}
resource "aws_iam_role_policy_attachment" "nodes_registry" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.nodes.name
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project}-${var.environment}-nodes"
  node_role_arn   = aws_iam_role.nodes.arn
  subnet_ids      = var.subnet_ids
  instance_types  = [var.node_instance_type]
  disk_size       = var.disk_size

  scaling_config {
    min_size     = var.node_min_size
    max_size     = var.node_max_size
    desired_size = var.node_desired_size
  }

  update_config { max_unavailable = 1 }

  depends_on = [
    aws_iam_role_policy_attachment.nodes_worker,
    aws_iam_role_policy_attachment.nodes_cni,
    aws_iam_role_policy_attachment.nodes_registry,
  ]

  tags = { Environment = var.environment }

  lifecycle { ignore_changes = [scaling_config[0].desired_size] }
}

resource "aws_eks_addon" "coredns" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "coredns"
  resolve_conflicts_on_create = "OVERWRITE"
  depends_on        = [aws_eks_node_group.main]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "kube-proxy"
  resolve_conflicts_on_create = "OVERWRITE"
}

resource "aws_eks_addon" "vpc_cni" {
  cluster_name      = aws_eks_cluster.main.name
  addon_name        = "vpc-cni"
  resolve_conflicts_on_create = "OVERWRITE"
}

output "cluster_name"           { value = aws_eks_cluster.main.name }
output "cluster_endpoint"       { value = aws_eks_cluster.main.endpoint }
output "cluster_ca_certificate" { value = aws_eks_cluster.main.certificate_authority[0].data }
output "cluster_oidc_issuer"    { value = aws_eks_cluster.main.identity[0].oidc[0].issuer }
