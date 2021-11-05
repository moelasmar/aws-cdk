import * as path from 'path';
import { App, Stack } from '@aws-cdk/core';
import { DockerImageCode, DockerImageFunction } from '../lib';

class TestStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id);

    new DockerImageFunction(this, 'MyLambda', {
      code: DockerImageCode.fromImageAsset(path.join(__dirname, 'docker-lambda-handler'), {
        file: 'Dockerfile',
        target: 'stage',
        buildArgs: { arg1: 'val1', arg2: 'val2' },
      }),
    });
  }
}

const app = new App();
new TestStack(app, 'lambda-ecr-docker');

app.synth();