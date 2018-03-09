const Utility = require("./Utility.js");
const fs = require('fs');

class ItemInstallerHelper {
	constructor(installer, item) {
		this.installer = installer;
		this.item = item;

		if(item.values) {
			this.hasValues = true;
			this.valuesFileName = Utility.writeToTempFile(item.values);
		}
	}

	getValuesHash() {

		if(this._diposed)
			throw new Error("ItemInstallerHelper -> object disposed.");

		return Utility.md5(Utility.md5(this.installer.globalValues) + Utility.md5(this.item.values));
	}

	dispose() {
		if(this.hasValues) {
			fs.unlinkSync(this.valuesFileName);
		}

		this._preparedCmd = null;
		this.__helmArtifact = null;
		this._diposed = true;
	}

	get releaseName() {

		if(this._diposed)
			throw new Error("ItemInstallerHelper -> object disposed.");

		return `${this.item.name}-${this.installer.namespace}`;
	}

	async isNew() {

		if(this._diposed)
			throw new Error("ItemInstallerHelper -> object disposed.");

		return !(await this.installer.getCurrentReleases()).includes(this.releaseName);
	}	

	buildHelmInstallOrUpgradeCmd({ dryRun = true, debug = false } = {}) {

		if(this._diposed)
			throw new Error("ItemInstallerHelper -> object disposed.");

		if(!this._preparedCmd) 
			throw new Error("Command is not prepared. In order to call buildHelmInstallOrUpgradeCmd, you must call to helmInstallOrUpgradeCmdPrepare first.");

		const dryRunArgument = dryRun ? "--dry-run" : "";
		const helmDebugArgument = debug ? "--debug" : "";
		return `${this._preparedCmd} ${dryRunArgument} ${helmDebugArgument}`;
	}

	async getHelmArtifact() {

		if(this._diposed)
			throw new Error("ItemInstallerHelper -> object disposed.");

		if(!this.__helmArtifact) {
			this.__helmArtifact = await this.installer.vcsGetter.get(this.item.source);
		}

		return this.__helmArtifact;
	}

	async helmInstallOrUpgradeCmdPrepare() {		

		if(this._diposed)
			throw new Error("ItemInstallerHelper -> object disposed.");

		let valuesArgument = "";
		const actionArgument = await this.isNew() ? "install --name" : "upgrade";

		if(this.installer.hasGlobalValues) {
			valuesArgument += ` -f "${this.installer.globalValuesFileName}" `
		}

		if(this.hasValues) {
			valuesArgument += ` -f "${this.valuesFileName}" `
		}	
		
		this._preparedCmd = `helm --namespace ${this.installer.namespace} ${actionArgument} ` +
			`"${this.releaseName}" "${(await this.getHelmArtifact()).localPath}" ${valuesArgument}`	
	}	
}

module.exports = ItemInstallerHelper;