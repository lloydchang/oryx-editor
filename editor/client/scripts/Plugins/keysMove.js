/** * Copyright (c) 2009 * Jan-Felix Schwarz * * Permission is hereby granted, free of charge, to any person obtaining a * copy of this software and associated documentation files (the "Software"), * to deal in the Software without restriction, including without limitation * the rights to use, copy, modify, merge, publish, distribute, sublicense, * and/or sell copies of the Software, and to permit persons to whom the * Software is furnished to do so, subject to the following conditions: * * The above copyright notice and this permission notice shall be included in * all copies or substantial portions of the Software. * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER * DEALINGS IN THE SOFTWARE. **/if (!ORYX.Plugins)     ORYX.Plugins = new Object();ORYX.Plugins.KeysMove = Clazz.extend({    facade: undefined,        construct: function(facade){            this.facade = facade;        this.copyElements = [];                this.facade.registerOnEvent(ORYX.CONFIG.EVENT_KEYDOWN, this.keyHandler.bind(this));             },    	move: function(key, far) {		// calculate the distance to move the objects and get the selection.		var distance = far? 20 : 5;		var selection = this.facade.getSelection();		var p = {x: 0, y: 0};				// switch on the key pressed and populate the point to move by.		switch(key) {			case ORYX.CONFIG.KEY_CODE_LEFT:				p.x = -1*distance;				break;			case ORYX.CONFIG.KEY_CODE_RIGHT:				p.x = distance;				break;			case ORYX.CONFIG.KEY_CODE_UP:				p.y = -1*distance;				break;			case ORYX.CONFIG.KEY_CODE_DOWN:				p.y = distance;				break;		}				// move each shape in the selection by the point calculated and update it.		selection = selection.findAll(function(shape){ 			// Check if this shape is docked to an shape in the selection						if(shape instanceof ORYX.Core.Node && shape.dockers.length == 1 && selection.include( shape.dockers.first().getDockedShape() )){ 				return false 			} 						// Check if any of the parent shape is included in the selection			var s = shape.parent; 			do{ 				if(selection.include(s)){ 					return false				}			}while(s = s.parent); 						// Otherwise, return true			return true;					});				selection = selection.map(function(shape){ 			if( shape instanceof ORYX.Core.Node ){				/*if( shape.dockers.length == 1 ){					return shape.dockers.first()				} else {*/					return shape				//}			} else if( shape instanceof ORYX.Core.Edge ) {								var dockers = shape.dockers;								if( selection.include( shape.dockers.first().getDockedShape() ) ){					dockers = dockers.without( shape.dockers.first() )				}				if( selection.include( shape.dockers.last().getDockedShape() ) ){					dockers = dockers.without( shape.dockers.last() )				}								return dockers											} else {				return null			}				}).flatten().compact();				if (selection.size() > 0) {			//Command-Pattern for dragging several Shapes			var dragCommand = ORYX.Core.Command.extend({				construct: function(moveShapes, offset, facade){					this.moveShapes = moveShapes;					this.offset = offset;					this.facade = facade;					this.dockers = this.moveShapes.map(function(shape){						return shape instanceof ORYX.Core.Controls.Docker ? {							docker: shape,							dockedShape: shape.getDockedShape(),							refPoint: shape.referencePoint						} : null					}).compact();					this.selection = this.facade.getSelection();									},				execute: function(){					// Undock all nodes					this.dockAllShapes();					// Move the shapes					this.move(this.offset);										this.facade.getCanvas().update();										// Set the selection to the current selection					this.facade.setSelection(this.selection);				},				rollback: function(){					// Moves by the inverted offset					var offset = {						x: -this.offset.x,						y: -this.offset.y					};					// Move the shapes					this.move(offset);					// Undock all nodes					this.dockAllShapes(true);										this.facade.getCanvas().update();										// Set the selection to the current selection					this.facade.setSelection(this.selection);				},				move: function(offset){									// Move all Shapes by these offset					for (var i = 0; i < this.moveShapes.length; i++) {						var value = this.moveShapes[i];												/*if (value instanceof ORYX.Core.Node && value.dockers.length == 1) {							value.dockers.first().bounds.moveBy(offset);						}						else {*/							value.bounds.moveBy(offset);														if (value instanceof ORYX.Core.Node) {															var childShapesNodes = value.getChildShapes(true).findAll(function(shape){									return shape instanceof ORYX.Core.Node								});								var childDockedShapes = childShapesNodes.collect(function(shape){									return shape.getAllDockedShapes()								}).flatten().uniq();								var childDockedEdge = childDockedShapes.findAll(function(shape){									return shape instanceof ORYX.Core.Edge								});								childDockedEdge = childDockedEdge.findAll(function(shape){									return shape.getAllDockedShapes().all(function(dsh){										return childShapesNodes.include(dsh)									})								});								var childDockedDockers = childDockedEdge.collect(function(shape){									return shape.dockers								}).flatten();																for (var j = 0; j < childDockedDockers.length; j++) {									var docker = childDockedDockers[j];									if (!docker.getDockedShape() && !this.moveShapes.include(docker)) {										docker.bounds.moveBy(offset);										//docker.update();									}								}															}						//}												//value.update();					}									},				dockAllShapes: function(shouldDocked){					// Undock all Nodes					for (var i = 0; i < this.dockers.length; i++) {						var docker = this.dockers[i].docker;												docker.setDockedShape(shouldDocked ? this.dockers[i].dockedShape : undefined)						if (docker.getDockedShape()) {							docker.setReferencePoint(this.dockers[i].refPoint);							//docker.update();						}					}				}			});						//Stop moving at canvas borders			var selectionBounds = [ this.facade.getCanvas().bounds.lowerRight().x,			                        this.facade.getCanvas().bounds.lowerRight().y,			                        0,			                        0 ];			selection.each(function(s) {				selectionBounds[0] = Math.min(selectionBounds[0], s.bounds.upperLeft().x);				selectionBounds[1] = Math.min(selectionBounds[1], s.bounds.upperLeft().y);				selectionBounds[2] = Math.max(selectionBounds[2], s.bounds.lowerRight().x);				selectionBounds[3] = Math.max(selectionBounds[3], s.bounds.lowerRight().y);			});			if(selectionBounds[0]+p.x < 0)				p.x = -selectionBounds[0];			if(selectionBounds[1]+p.y < 0)				p.y = -selectionBounds[1];			if(selectionBounds[2]+p.x > this.facade.getCanvas().bounds.lowerRight().x)				p.x = this.facade.getCanvas().bounds.lowerRight().x - selectionBounds[2];			if(selectionBounds[3]+p.y > this.facade.getCanvas().bounds.lowerRight().y)				p.y = this.facade.getCanvas().bounds.lowerRight().y - selectionBounds[3];						if(p.x!=0 || p.y!=0) {				// Instantiate the dragCommand				var commands = [new dragCommand(selection, p, this.facade)];				// Execute the commands							this.facade.executeCommands(commands);			}					}	},	    /**     * The key handler for this plugin. Every action from the set of cut, copy,     * paste and delete should be accessible trough simple keyboard shortcuts.     * This method checks whether any event triggers one of those actions.     *     * @param {Object} event The keyboard event that should be analysed for     *     triggering of this plugin.     */    keyHandler: function(event){        //TODO document what event.which is.                ORYX.Log.debug("keysMove.js handles a keyEvent.");                // assure we have the current event.        if (!event)             event = window.event;                // get the currently pressed key and state of control key.        var pressedKey = event.which || event.keyCode;        var ctrlPressed = event.ctrlKey;		// if the key is one of the arrow keys, forward to move and return.		if ([ORYX.CONFIG.KEY_CODE_LEFT, ORYX.CONFIG.KEY_CODE_RIGHT,			ORYX.CONFIG.KEY_CODE_UP, ORYX.CONFIG.KEY_CODE_DOWN].include(pressedKey)) {						this.move(pressedKey, !ctrlPressed);			return;		}		    }	});