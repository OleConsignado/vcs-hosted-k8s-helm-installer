const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const fs = require('fs');
const Utility = require("./Utility.js");
const Item = require("./Item.js");
const ItemInstallerHelper = require("./ItemInstallerHelper.js");

class Installer {

	constructor({ namespace, globalValues, vcsGetter }) {
		
		if(!namespace) 
			throw new Error("Installer -> Param namespace is required");

		this.namespace = namespace;

		if(!vcsGetter)
			throw new Error("Installer -> Param vcsGetter is required");

		this.vcsGetter = vcsGetter;

		this.hasGlobalValues = false;

		if(globalValues) {
			this.hasGlobalValues = true;
			this.globalValuesFileName = Utility.writeToTempFile(globalValues);
			this.globalValues = globalValues;
		}
	}

	_resetCurrentReleasesListCache() {
		this.__currentReleases = undefined;
	}

	async getCurrentReleases() {

		if(this._diposed)
			throw new Error("Installer -> object disposed.");

		if(this.__currentReleases == undefined) {
			const { stdout } = await exec(`helm ls -q --deployed --namespace=${this.namespace}`);
			this.__currentReleases = stdout.split(/\r?\n/).filter(v => !!v);
		}

		return this.__currentReleases;
	}

	async getFailedReleases() {

		if(this._diposed)
			throw new Error("Installer -> object disposed.");

		const { stdout } = await exec(`helm ls -q --failed --namespace=${this.namespace}`);

		return stdout.split(/\r?\n/).filter(v => !!v);
	}

	async installOrUpgrade(item) {
		if(this._diposed)
			throw new Error("Installer -> object disposed.");

		const helper = new ItemInstallerHelper(this, new Item(item));

		try {

			const helmArtifact = await helper.getHelmArtifact();
			const installedFilename = path.join(helmArtifact.localPath, '.helm-installed');
			
			let shouldInstallOrUpgrade = false;
			const helmInstalledFileExists = fs.existsSync(installedFilename);

			if(await helper.isNew()) {
				shouldInstallOrUpgrade = true;
				console.info(`${helper.releaseName}: Will perform install due to new release.`);
			} else if(helmArtifact.changedSinceLastGet) {
				shouldInstallOrUpgrade = true;
				console.info(`${helper.releaseName}: Will perform upgrade/install due to changes in helm artifact.`);
			} else if(helmInstalledFileExists) {
				const currentValuesHash = fs.readFileSync(installedFilename);
				if(currentValuesHash != helper.getValuesHash()) {
					console.info(`${helper.releaseName}: Will perform upgrade due to changes in values.`);
					shouldInstallOrUpgrade = true;	
				}
			} else if(!helmInstalledFileExists) {
				console.info(`${helper.releaseName}: Will perform upgrade/install due to '.helm-installed file' not exists (new install or previous upgrade has failed).`);
				shouldInstallOrUpgrade = true;
			}

			if(shouldInstallOrUpgrade) {

				if(helmInstalledFileExists) {
					fs.unlinkSync(installedFilename);
				}

				console.info(`${helper.releaseName}: Performing install or upgrade.`);

				await helper.helmInstallOrUpgradeCmdPrepare();

				let exception = null;

				try {

					if(await helper.isNew()) {
						if((await this.getFailedReleases()).includes(helper.releaseName)) {
							console.info(`${helper.releaseName}: This is a new installation but it has failed before, so removing the failed release ...`)
							await exec(`helm delete ${helper.releaseName} --purge`);
						}
					}

					await exec(helper.buildHelmInstallOrUpgradeCmd({ dryRun: true, debug: true }));
					console.info(`${helper.releaseName}: Helm dry run succeed.`);

					try {
						await exec(helper.buildHelmInstallOrUpgradeCmd({ dryRun: false, debug: true }));
						this._resetCurrentReleasesListCache();
						fs.writeFileSync(installedFilename, helper.getValuesHash());
						console.info(`${helper.releaseName}: Helm install or upgrade succeed.`);
					} catch(e) {
						console.error(`${helper.releaseName}: Helm install or upgrade failed.`);
						exception = e;
					}
				} catch(e) {
					console.error(`${helper.releaseName}: Helm dry run failed.`);
					exception = e;
				}

				if(exception)
					throw exception;

			} else {
				console.info(`${helper.releaseName}: Already up to date, nothing to do.`);
			}

		} finally {
			helper.dispose();
		}

	}

	dispose() {
		if(this.hasGlobalValues) {
			fs.unlinkSync(this.globalValuesFileName);
		}

		this._diposed = true;
	}	
}

module.exports = Installer;