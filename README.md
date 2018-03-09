# VCS Hosted Kubernetes Helm Installer
[![Build Status](https://travis-ci.org/mnconsulting/vcs-hosted-k8s-helm-installer.svg?branch=master)](https://travis-ci.org/mnconsulting/vcs-hosted-k8s-helm-installer)

VCS Hosted Kubernetes Helm Installer provides a simple API designed to perform install and upgrade operations for Kubernetes Helm based configuration APPs hosted in a Version Control System (curretly supports Git and TFS).

## Installation

VCS Hosted Kubernetes Helm Installer is available as [npm package](https://www.npmjs.com/package/vcs-hosted-k8s-helm-installer).

```
$ npm install vcs-hosted-k8s-helm-installer
```

## Usage example

This example uses VCS Getter library which is not a dependency of VCS Hosted Kubernetes Helm Installer, so you must to install it in addiction to VCS Hosted Kubernetes Helm Installer:

```
$ npm install vcs-getter
```

```javascript
#!/usr/bin/env node

const { VCSGetter } = require("vcs-getter");
const { Installer } = require("vcs-hosted-k8s-helm-installer");

async function myExample() {
    const installer = new Installer({
        namespace: "vcs-hosted-k8s-helm-installer", 
        globalValues: { "replicaCount": 2 },
        vcsGetter: new VCSGetter()
    });

    try {
        await installer.installOrUpgrade({
          "name": "appname",
          "source": "https://github.com/you/yourapp/tree/master/folder/where/is/the/helm/chart",
          "values": {
            "cpuLimit": "500m"
          }
        });
    } finally {
        installer.dispose();
    }
}

myExample().catch(e => console.error(e));
```