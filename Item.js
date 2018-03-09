
class Item {
	constructor({ name, source, values }) {
		
		if(!name)
			throw new Error("Item -> Param name is required.");

		this.name = name;

		if(!source)
			throw new Error("Param source is required.");			

		this.source = source;
		
		this.values = values;
	}
}

module.exports = Item;