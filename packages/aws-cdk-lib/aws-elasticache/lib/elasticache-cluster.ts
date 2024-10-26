import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface ElastiCacheClusterProps {
  /**
   * The VPC where the ElastiCache cluster will be deployed
   */
  readonly vpc: ec2.IVpc;
  
  /**
   * The cache engine version to use
   * @default - 6.x (Redis)
   */
  readonly engineVersion?: string;
  
  /**
   * The node type for the ElastiCache cluster
   * @default - cache.t3.micro
   */
  readonly nodeType?: string;
  
  /**
   * Number of cache nodes in the cluster
   * @default 1
   */
  readonly numCacheNodes?: number;
  
  /**
   * The name of the cache parameter group to associate with this cache cluster
   */
  readonly parameterGroupFamily?: string;
  
  /**
   * Security groups to attach to the cluster
   * @default - A new security group is created
   */
  readonly securityGroups?: ec2.ISecurityGroup[];
  
  /**
   * The weekly time range during which maintenance updates can occur.
   * @default - No preference
   */
  readonly preferredMaintenanceWindow?: string;
  
  /**
   * Specifies the weekly time range during which maintenance 
   * on the cache cluster is performed
   */
  readonly port?: number;
}

export class ElastiCacheCluster extends Construct {
  /**
   * The underlying ElastiCache cluster resource
   */
  public readonly cluster: elasticache.CfnCacheCluster;
  
  /**
   * The security group associated with the cluster
   */
  public readonly securityGroup: ec2.ISecurityGroup;
  
  /**
   * The subnet group where the cluster is placed
   */
  public readonly subnetGroup: elasticache.CfnSubnetGroup;

  constructor(scope: Construct, id: string, props: ElastiCacheClusterProps) {
    super(scope, id);

    // Create a subnet group for the cluster
    this.subnetGroup = new elasticache.CfnSubnetGroup(this, 'SubnetGroup', {
      description: 'Subnet group for ElastiCache cluster',
      subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    // Create or use provided security group
    if (props.securityGroups && props.securityGroups.length > 0) {
      this.securityGroup = props.securityGroups[0];
    } else {
      this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: props.vpc,
        description: 'Security group for ElastiCache cluster',
        allowAllOutbound: true,
      });
    }

    // Create parameter group if family is specified
    let parameterGroup;
    if (props.parameterGroupFamily) {
      parameterGroup = new elasticache.CfnParameterGroup(this, 'ParameterGroup', {
        cacheParameterGroupFamily: props.parameterGroupFamily,
        description: 'Parameter group for ElastiCache cluster',
      });
    }

    // Create the ElastiCache cluster
    this.cluster = new elasticache.CfnCacheCluster(this, 'Resource', {
      engine: 'redis',
      cacheNodeType: props.nodeType ?? 'cache.t3.micro',
      numCacheNodes: props.numCacheNodes ?? 1,
      engineVersion: props.engineVersion ?? '6.x',
      vpcSecurityGroupIds: [this.securityGroup.securityGroupId],
      cacheSubnetGroupName: this.subnetGroup.ref,
      ...(parameterGroup && { cacheParameterGroupName: parameterGroup.ref }),
      ...(props.preferredMaintenanceWindow && {
        preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      }),
      ...(props.port && { port: props.port }),
    });
  }

  /**
   * Allow incoming connections on the default Redis port
   */
  public allowIngressFrom(peer: ec2.IPeer, port?: number) {
    this.securityGroup.addIngressRule(
      peer,
      ec2.Port.tcp(port ?? 6379),
      'Allow inbound Redis traffic'
    );
  }

  /**
   * Returns the cluster endpoint address
   */
  public get clusterEndpoint(): string {
    return this.cluster.attrRedisEndpointAddress;
  }

  /**
   * Returns the cluster endpoint port
   */
  public get clusterPort(): string {
    return this.cluster.attrRedisEndpointPort;
  }
}
