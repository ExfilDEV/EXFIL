"use strict";

var utility = require('./utility.js');

var items = JSON.parse(utility.readJson("data/configs/items.json"));

function getOffers(request) {
	var response = JSON.parse(utility.readJson("data/configs/ragfair/search.json"));
	var handbook = JSON.parse(utility.readJson('data/configs/templates.json'));

	// request an item or a category of items
	if (request.handbookId != "") {
		var isCateg = false;

		for (var categ of handbook.data.Categories) {
			// find the category in the handbook
			if (categ.Id == request.handbookId) {
				isCateg = true;

				// list all item of the category
				for (var item of handbook.data.Items) {
					if (item.ParentId == categ.Id) {
						response.data.offers.push(createOffer(item.Id));
					}
				}

				// recursive loops for sub categories
				for (var categ2 of handbook.data.Categories) {
					if (categ2.ParentId == categ.Id) {
						for (var item of handbook.data.Items) {
							if (item.ParentId == categ2.Id) {
								response.data.offers.push(createOffer(item.Id));
							}
						}
					}
				}
			}
		}

		// its a specific item searched then
		if (isCateg == false) {
			var tmpId = "54009119af1c881c07000029";
	
			for (var curItem in items.data) {
				if (curItem == request.handbookId) {
					tmpId = curItem;
					break;
				}
			}

			response.data.offers.push(createOffer(tmpId));
		}	
	}

	if (request.linkedSearchId != "") {	
		var itemLink = items.data[request.linkedSearchId];

		for (var itemSlot of itemLink._props.Slots) {
			for (var itemSlotFilter of itemSlot._props.filters) {
				for (var mod of itemSlotFilter.Filter) {
					response.data.offers.push(createOffer(mod));
				}
			}
		}
	}

	return JSON.stringify(response);
}

function createOffer(template) {
	var offerBase = JSON.parse(utility.readJson("data/configs/ragfair/offerBase.json"));

	offerBase._id = template;
	offerBase.items[0]._tpl = template;

	return offerBase;
}

module.exports.getOffers = getOffers;