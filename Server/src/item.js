"use strict";

var utility = require('./utility.js');
var profile = require('./profile.js');



var items = JSON.parse(utility.readJson('data/configs/items.json'));
var stashX = 10; // fix for your stash size
var stashY = 66; // ^ if you edited it ofc
var output = "";
var curr = [];
curr['RUB'] = "5449016a4bdc2d6f028b456f";
curr['USD'] = "5696686a4bdc2da3298b456a";
curr['EUR'] = "569668774bdc2da2298b4568";

function GenItemID() {
	return Math.floor(new Date() / 1000) + utility.getRandomInt(0, 999999999).toString();
}

function getItem(template) {
	for (var itm in items.data) {
		if (items.data[itm]._id && items.data[itm]._id == template) {
			var item = items.data[itm];
			return [true, item];
		}
	}

	return [false, {}];
}

function getSize(itemtpl, itemID, location) {
	var toDo = [itemID];
	var tmpItem = getItem(itemtpl)[1];

	var outX = 0, outY = 0, outL = 0, outR = 0, outU = 0, outD = 0, tmpL = 0, tmpR = 0, tmpU = 0, tmpD = 0;
	
	outX = tmpItem._props.Width;
	outY = tmpItem._props.Height;
	
	while (true) {
		if (toDo[0] != undefined) {
			for (var tmpKey in location) {
				if (location[tmpKey].parentId && location[tmpKey].parentId == toDo[0]) {
					toDo.push(location[tmpKey]._id);
					tmpItem = getItem(location[tmpKey]._tpl)[1];

					if (tmpItem._props.ExtraSizeLeft != undefined && tmpItem._props.ExtraSizeLeft > tmpL) {
						tmpL = tmpItem._props.ExtraSizeLeft;
					}
					
					if (tmpItem._props.ExtraSizeRight != undefined && tmpItem._props.ExtraSizeRight > tmpR) {
						tmpR = tmpItem._props.ExtraSizeRight;
					}
					
					if (tmpItem._props.ExtraSizeUp != undefined && tmpItem._props.ExtraSizeUp > tmpU) {
						tmpU = tmpItem._props.ExtraSizeUp;
					}
					
					if (tmpItem._props.ExtraSizeDown != undefined && tmpItem._props.ExtraSizeDown > tmpD) {
						tmpD = tmpItem._props.ExtraSizeDown;
					}
				}
			}

			outL += tmpL; outR += tmpR; outU += tmpU; outD += tmpD;
			tmpL = 0; tmpR = 0; tmpU = 0; tmpD = 0;
			toDo.splice(0, 1);

			continue;
		}

		break;
	}
	
	return [outX, outY, outL, outR, outU, outD];
}

function acceptQuest(tmpList, body) {
	var tmpList = profile.getCharacterData();

	tmpList.data[1].Quests.push({"qid": body.qid.toString(), "startTime": 1337, "status": 2}); // statuses seem as follow - 1 - not accepted | 2 - accepted | 3 - failed | 4 - completed
	
	profile.setCharacterData(tmpList);
	return "OK";
}

function completeQuest(tmpList, body) {
	var tmpList = profile.getCharacterData();

	for (var quest of tmpList.data[1].Quests) {
		if (quest.qid == body.qid) {
			quest.status = 4;
		}
	}

	//send reward to the profile : if quest_list.id == bodyqid then quest_list.succes

	profile.setCharacterData(tmpList);
	return "OK";
}

function questHandover(tmpList, body) {
	var counter = 0;
	var found = false;

 	for (var itemHandover of body.items) {
		counter += itemHandover.count;
		removeItem(tmpList, {Action: 'Remove', item: itemHandover.id});
	}

 	for (var backendCounter in tmpList.data[1].BackendCounters) {
		if (backendCounter == body.conditionId) {
			tmpList.data[1].BackendCounters[body.conditionId].value += counter;
			found = true;
		}
	}

 	if (!found) {
		tmpList.data[1].BackendCounters[body.conditionId] = {"id" : body.conditionId, "qid" : body.qid, "value" : counter};
	}

 	profile.setCharacterData(tmpList);
	return "OK";
 }

 function addNote(tmpList, body) {
	tmpList.data[1].Notes.Notes.push({"Time": body.note.Time, "Text": body.note.Text});
	profile.setCharacterData(tmpList);
	return "OK";
 }

 function editNode(tmpList, body) {
	tmpList.data[1].Notes.Notes[body.index] = {"Time": body.note.Time, "Text": body.note.Text};
	profile.setCharacterData(tmpList);
	return "OK";
 }

 function deleteNote(tmpList, body) {
	tmpList.data[1].Notes.Notes.splice(body.index, 1);
	profile.setCharacterData(tmpList);
	return "OK";
 }

function moveItem(tmpList, body) {
	var prices = JSON.parse(utility.readJson('data/configs/assort/everythingTrader.json'));
	var tmpUserTrader = profile.getPurchasesData();
	var money3 = 0;
	for (var item of tmpList.data[0].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.parentId = body.to.id;
			item.slotId = body.to.container;
			money3 += prices.data.barter_scheme[item._tpl][0][0].count * 0.10;
			tmpUserTrader.data[item._id] = [[{ "_tpl": item._tpl, "count": money3 }]];
			if (body.to.location) {
				item.location = body.to.location;
			} else {
				if (item.location) {
					delete item.location;
				}
			}
			profile.setPurchasesData(tmpUserTrader);
			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}

function removeItem(tmpList, body) {
	var toDo = [body.item];

	while (true) {
		if (toDo[0] != undefined) {
			// needed else iterator may decide to jump over stuff
			while (true) {
				var tmpEmpty = "yes";

				for (var tmpKey in tmpList.data[0].Inventory.items) {
					if ((tmpList.data[0].Inventory.items[tmpKey].parentId && tmpList.data[0].Inventory.items[tmpKey].parentId == toDo[0])
					|| (tmpList.data[0].Inventory.items[tmpKey]._id && tmpList.data[0].Inventory.items[tmpKey]._id == toDo[0])) {
					
						output.data.items.del.push({"_id": tmpList.data[0].Inventory.items[tmpKey]._id});
						toDo.push(tmpList.data[0].Inventory.items[tmpKey]._id);
						tmpList.data[0].Inventory.items.splice(tmpKey, 1);
						
						tmpEmpty = "no";
					}
				}

				if (tmpEmpty == "yes") {
					break;
				};
			}

			toDo.splice(0, 1);
			continue;
		}

		break;
	}
	
	profile.setCharacterData(tmpList);
	return "OK";
}

function splitItem(tmpList, body) {
	for (var item of tmpList.data[0].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.StackObjectsCount -= body.count;
			
			var newItem = GenItemID();
			
			output.data.items.new.push({"_id": newItem, "_tpl": item._tpl, "parentId": body.container.id, "slotId": body.container.container, "location": body.container.location, "upd": {"StackObjectsCount": body.count}});
			tmpList.data[0].Inventory.items.push({"_id": newItem, "_tpl": item._tpl, "parentId": body.container.id, "slotId": body.container.container, "location": body.container.location, "upd": {"StackObjectsCount": body.count}});
			
			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}

function mergeItem(tmpList, body) {
	for (var key in tmpList.data[0].Inventory.items) {
		if (tmpList.data[0].Inventory.items[key]._id && tmpList.data[0].Inventory.items[key]._id == body.with) {
			for (var key2 in tmpList.data[0].Inventory.items) {
				if (tmpList.data[0].Inventory.items[key2]._id && tmpList.data[0].Inventory.items[key2]._id == body.item) {
					tmpList.data[0].Inventory.items[key].upd.StackObjectsCount = (tmpList.data[0].Inventory.items[key].upd.StackObjectsCount ? tmpList.data[0].Inventory.items[key].upd.StackObjectsCount : 1) + (tmpList.data[0].Inventory.items[key2].upd.StackObjectsCount ? tmpList.data[0].Inventory.items[key2].upd.StackObjectsCount : 1);
					output.data.items.del.push({"_id": tmpList.data[0].Inventory.items[key2]._id});
					tmpList.data[0].Inventory.items.splice(key2, 1);

					profile.setCharacterData(tmpList);
					return "OK";
				}
			}
		}
	}

	return "";
}

function foldItem(tmpList, body) {
	for (var item of tmpList.data[0].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.Foldable = {"Folded": body.value};

			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}

function toggleItem(tmpList, body) {
	for (var item of tmpList.data[0].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.Togglable = {"On": body.value};

			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}

function tagItem(tmpList, body) {
	for (var item of tmpList.data[0].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.Tag = {"Color": body.TagColor, "Name": body.TagName};

			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}

function bindItem(tmpList, body) {
	for (var item of tmpList.data[0].Inventory.fastPanel) {
		// if binded items is already in fastPanel
		if (item == body.item) {
			// we need to remove index before re-adding somewhere else 
			item = "";
		}
	}

	item = body.item;
	profile.setCharacterData(tmpList);
	return "OK";
}

function eatItem(tmpList, body) {
	for (var item of tmpList.data[0].Inventory.items) {
		if (item._id == body.item) {
			var effects = getItem(item._tpl)[1]._props.effects_health;
		}
	}

	var hydration = tmpList.data[0].Health.HydrationLimitedValue;
	var energy = tmpList.data[0].Health.EnergyLimitedValue;

	hydration.CurrAndMaxValue.CurrentValue += effects.hydration.value;
	energy.CurrAndMaxValue.CurrentValue += effects.energy.value;

	if (hydration.CurrAndMaxValue.CurrentValue > hydration.CurrAndMaxValue.MaxValue) {
		hydration.CurrAndMaxValue.CurrentValue = hydration.CurrAndMaxValue.MaxValue;
	}
	
	if (energy.CurrAndMaxValue.CurrentValue > energy.CurrAndMaxValue.MaxValue) {
		energy.CurrAndMaxValue.CurrentValue = energy.CurrAndMaxValue.MaxValue;
	}

 	profile.setCharacterData(tmpList);
 	removeItem(tmpList, {Action: 'Remove', item: body.item});
 	return "OK";
}

function healPlayer(tmpList, body) {
	// healing body part
	for (var bdpart in tmpList.data[1].Health.BodyParts) {
		if (bdpart == body.part) {
			tmpList.data[1].Health.BodyParts[bdpart].Health.Current += body.count;
		}
	}

	// update medkit used (hpresource)
	for (var item of tmpList.data[0].Inventory.items) {
		// find the medkit in the inventory
		if (item._id == body.item) {
			if (typeof item.upd.MedKit === "undefined") {
				var maxhp = getItem(item._tpl)[1]._props.MaxHpResource;
				
				item.upd.MedKit = {"HpResource": maxhp - body.count};
			} else {
				item.upd.MedKit.HpResource -= body.count;
			}

			profile.setCharacterData(tmpList);

			// remove medkit if its empty
			if (item.upd.MedKit.HpResource == 0 ) {
				removeItem(tmpList, {Action: 'Remove', item: body.item});
			}
		}
	}
	
	return "OK";
}

function recheckInventoryFreeSpace(tmpList){
	var Stash2D = Array(stashY).fill(0).map(x => Array(stashX).fill(0));

	for (var item of tmpList.data[0].Inventory.items) {
		// hideout
		if (item.parentId == "hideout" && item.location != undefined) {
			var tmpItem = getItem(item._tpl)[1];
			var tmpSize = getSize(item._tpl, item._id, tmpList.data[0].Inventory.items);
			
			//			x			L				r
			var iW = tmpSize[0] + tmpSize[2] + tmpSize[3];
			
			//			y			u				d
			var iH = tmpSize[1] + tmpSize[4] + tmpSize[5];
			var fH = (item.location.rotation == "Vertical" ? iW : iH);
			var fW = (item.location.rotation == "Vertical" ? iH : iW);
			
			for (var x = 0; x < fH; x++) {
				Stash2D[item.location.y + x].fill(1, item.location.x, item.location.x + fW);
			}
		}
	}

	return Stash2D;
}

function payMoney(tmpList, amount, body) {
	var tmpTraderInfo = JSON.parse(utility.readJson('data/configs/traders/' + body.tid.replace(/[^a-zA-Z0-9]/g, '') + '.json'));
	var currency = curr[tmpTraderInfo.currency];

	for (var item of tmpList.data[0].Inventory.items) {
		if (item._tpl == currency && item.upd.StackObjectsCount >= amount) {
			item.upd.StackObjectsCount -= amount;
			profile.setCharacterData(tmpList);
			
			console.log("Money paid: " + amount + " " + tmpTraderInfo.currency);
			return true;
		}
	}

	console.log("no money found");
	return false;
}

function getMoney(tmpList, amount, body) {
	var tmpTraderInfo = JSON.parse(utility.readJson('data/configs/traders/' + body.tid.replace(/[^a-zA-Z0-9]/g, '') + '.json'));
	var currency = curr[tmpTraderInfo.currency];

	for (var item of tmpList.data[0].Inventory.items) {
		if (item._tpl == currency) {
			item.upd.StackObjectsCount += amount;
			profile.setCharacterData(tmpList);

			console.log("Money received: " + amount + " " + tmpTraderInfo.currency);
			return true;
		}
	}

	console.log("no money found");
	return false;
}

function buyItem(tmpList, tmpUserTrader, body) {
	var prices = JSON.parse(utility.readJson('data/configs/assort/everythingTrader.json'));
	var money2 = 0;
	var tmpTrader = JSON.parse(utility.readJson('data/configs/assort/' + body.tid.replace(/[^a-zA-Z0-9]/g, '') + '.json'));
	var money = tmpTrader.data.barter_scheme[body.item_id][0][0].count * body.count;

	// print debug information
	console.log("Item:");
	console.log(body.scheme_items);

	// pay the item	
	if (!payMoney(tmpList, money, body)) {
		console.log("no money found");
		return "";
	}
		
	for (var item of tmpTrader.data.items) {
		if (item._id && item._id == body.item_id) {
			var MaxStacks = 1;
			var StacksValue = [];

			var tmpItem = getItem(item._tpl)[1];

			// split stacks if the size is higher than allowed
			if (body.count > tmpItem._props.StackMaxSize) {
				var count = body.count;
					
				//maxstacks if not divided by then +1
				var calc = body.count - (Math.floor(body.count / tmpItem._props.StackMaxSize) * tmpItem._props.StackMaxSize);
				MaxStacks = (calc > 0)? MaxStacks + Math.floor(count / tmpItem._props.StackMaxSize):Math.floor(count / tmpItem._props.StackMaxSize);

				for (var sv = 0; sv < MaxStacks; sv++){
					if (count > 0) {
						if (count > tmpItem._props.StackMaxSize) {
							count = count - tmpItem._props.StackMaxSize;
							StacksValue[sv] = tmpItem._props.StackMaxSize;
						} else {
							StacksValue[sv] = count;
						}
					}
				}
			} else {
				StacksValue[0] = body.count;
			}

			// for each stack
			for (var stacks = 0; stacks < MaxStacks; stacks++){
				var tmpSizeX = 0;
				var tmpSizeY = 0;
				var badSlot = "no";
				var addedProperly = false;
				var tmpSize = getSize(item._tpl, item._id, tmpTrader.data.item);
				var StashFS_2D = recheckInventoryFreeSpace(tmpList);					
				
				tmpSizeX = tmpSize[0] + tmpSize[2] + tmpSize[3];
				tmpSizeY = tmpSize[1] + tmpSize[4] + tmpSize[5];
					
				for (var y = 0; y < stashY; y++) {
					for (var x = 0; x < stashX; x++) {
						badSlot = "no";

						for (var itemY = 0; itemY < tmpSizeY; itemY++) {
							for (var itemX = 0; itemX < tmpSizeX; itemX++) {
								if (StashFS_2D[y + itemY][x + itemX] != 0) {
									badSlot = "yes";
									break;
								}
							}

							if (badSlot == "yes") {
								break;
							}
						}

						if (badSlot == "no") {
							var newItem = GenItemID();
								
							output.data.items.new.push({"_id": newItem, "_tpl": item._tpl, "parentId": "hideout", "slotId": "hideout", "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
							tmpList.data[0].Inventory.items.push({"_id": newItem, "_tpl": item._tpl, "parentId": "hideout", "slotId": "hideout", "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
							var toDo = [[item._id, newItem]];
							money2 += prices.data.barter_scheme[item._tpl][0][0].count * 0.10;
							tmpUserTrader.data[newItem] = [[{"_tpl": item._tpl, "count": money2}]];
								
							while (true) {
								if (toDo[0] != undefined) {
									for (var tmpKey in tmpTrader.data.items) {
										if (tmpTrader.data.items[tmpKey].parentId && tmpTrader.data.items[tmpKey].parentId == toDo[0][0]) {
											newItem = GenItemID();
											output.data.items.new.push({"_id": newItem, "_tpl": tmpTrader.data.items[tmpKey]._tpl, "parentId": toDo[0][1], "slotId": tmpTrader.data.items[tmpKey].slotId, "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
											tmpList.data[0].Inventory.items.push({"_id": newItem, "_tpl": tmpTrader.data.items[tmpKey]._tpl, "parentId": toDo[0][1], "slotId": tmpTrader.data.items[tmpKey].slotId, "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
											toDo.push([tmpTrader.data.items[tmpKey]._id, newItem]);
										}
									}

									toDo.splice(0, 1);
									continue;
								}

								break;
							}

							addedProperly = true;
							break;
						}
					}
						
					if (addedProperly) {
						break;
					}
				}
			}	
			
			// assumes addedProperly is always true
			profile.setPurchasesData(tmpUserTrader);
			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}

function sellItem(tmpList, tmpUserTrader, body) {
	var tmpTraderInfo = JSON.parse(utility.readJson('data/configs/traders/' + body.tid.replace(/[^a-zA-Z0-9]/g, '') + '.json'));
	var prices = JSON.parse(utility.readJson('data/configs/assort/everythingTrader.json'));
	var money = 0;

	// print debug information
	console.log("Items:");
	console.log(body.items);

	// find the items
	for (var item of tmpList.data[0].Inventory.items) {
		for (var i in body.items) {
			var checkID = body.items[i].id.replace(' clone', '').replace(' clon', '');

			// item found
			if (item && item._id == checkID) {
				// add money to return to the player
				money += prices.data.barter_scheme[item._tpl][0][0].count * body.items[i].count * 0.10;
				
				if (removeItem(tmpList, {Action: 'Remove', item: checkID}) == "OK") {
					delete tmpUserTrader.data[checkID];
				}
			}
		}
	}

	// get money the item
	if (!getMoney(tmpList, money, body)) {
		return "";
	}
				
	profile.setPurchasesData(tmpUserTrader);
	return "OK";
}

function confirmTrading(tmpList, body)  {
	var tmpUserTrader = profile.getPurchasesData();

	// buying
	if (body.type == "buy_from_trader")  {
		return buyItem(tmpList, tmpUserTrader, body);
	}

	// selling
	if (body.type == "sell_to_trader") {				
		return sellItem(tmpList, tmpUserTrader, body)
	}

	return "";
}

function confirmRagfairTrading(tmpList, body) {
	body.Action = "TradingConfirm";
	body.type = "buy_from_trader";
	body.tid = "everythingTrader";
	body.item_id = body.offerId;
	body.scheme_id = 0;
	body.scheme_items = body.items;

	if (confirmTrading(tmpList, body) == "OK" ) {
		return "OK";
	} else {
		return "error";
	}
}

function getOutput() {
	return output;
}

function resetOutput() {
	output = JSON.parse('{"err":0, "errmsg":null, "data":{"items":{"new":[], "change":[], "del":[]}, "badRequest":[], "quests":[], "ragFairOffers":[]}}');
}

function handleMoving(body) {	
	var tmpList = profile.getCharacterData();

	switch(body.Action) {
		case "QuestAccept":
			return acceptQuest(tmpList, body);

		case "QuestComplete":
			return completeQuest(tmpList, body);

		case "QuestHandover":
			return questHandover(tmpList, body);

		case "AddNote":
			return addNote(tmpList, body);

		case "EditNote":
			return editNode(tmpList, body);

		case "DeleteNote":
			return deleteNote(tmpList, body);

		case "Move":
			return moveItem(tmpList, body);

		case "Remove":
			return removeItem(tmpList, body);

		case "Split":
			return splitItem(tmpList, body);

		case "Merge":
			return mergeItem(tmpList, body);
		
		case "Fold":
			return foldItem(tmpList, body);

		case "Toggle":
			return toggleItem(tmpList, body);
            
		case "Tag":
			return tagItem(tmpList, body);

		case "Bind":
			return bindItem(tmpList, body);

		case "Eat":
			return eatItem(tmpList, body);

		case "Heal":
			return healPlayer(tmpList, body);

		case "TradingConfirm":
			return confirmTrading(tmpList, body);

		case "RagFairBuyOffer":
			return confirmRagfairTrading(tmpList, body);

		default:
			console.log("UNHANDLED ACTION");
            return "";
	}
}

function moving(info) {
	var output = "";
		
	// handle all items
	for (var i = 0; i < info.data.length; i++) {
		output = handleMoving(info.data[i]);
	}

	// return items
	if (output == "OK") {
		return JSON.stringify(getOutput());
	}

	return output;    
}

module.exports.getOutput = getOutput;
module.exports.resetOutput = resetOutput;
module.exports.moving = moving;