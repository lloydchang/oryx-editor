
/**
 * Copyright (c) 2008, Kai Schlichting
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 **/
if (!ORYX.Plugins) 
    ORYX.Plugins = new Object();

ORYX.Plugins.BPMNValidator = Clazz.extend({

    facade: undefined,
    
    construct: function(facade){
    
        this.facade = facade;
        
        this.active = false;
        this.raisedEventIds = [];
        
        this.facade.offer({
            'name': "BPMN Validator",
            'functionality': this.showOverlay.bind(this),
            'group': "Verification",
            'icon': ORYX.PATH + "images/error_go.png",
            'description': "Validate",
            'index': 1,
            'minShape': 0,
            'maxShape': 0
        });
        
    },
    
    showOverlay: function(){
    
        if (this.active) {
        
            this.raisedEventIds.each(function(id){
                this.facade.raiseEvent({
                    type: "overlay.hide",
                    id: id
                });
            }.bind(this));
            
            this.raisedEventIds = [];
            this.active = !this.active;
            
        }
        else {
        
            // Force to set all resource IDs
            var serializedDOM = DataManager.serializeDOM(this.facade);
            
            //add namespaces
            serializedDOM = '<?xml version="1.0" encoding="utf-8"?>' +
            '<html xmlns="http://www.w3.org/1999/xhtml" ' +
            'xmlns:b3mn="http://b3mn.org/2007/b3mn" ' +
            'xmlns:ext="http://b3mn.org/2007/ext" ' +
            'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" ' +
            'xmlns:atom="http://b3mn.org/2007/atom+xhtml">' +
            '<head profile="http://purl.org/NET/erdf/profile">' +
            '<link rel="schema.dc" href="http://purl.org/dc/elements/1.1/" />' +
            '<link rel="schema.dcTerms" href="http://purl.org/dc/terms/ " />' +
            '<link rel="schema.b3mn" href="http://b3mn.org" />' +
            '<link rel="schema.oryx" href="http://oryx-editor.org/" />' +
            '<link rel="schema.raziel" href="http://raziel.org/" />' +
            '<base href="' +
            location.href.split("?")[0] +
            '" />' +
            '</head><body>' +
            serializedDOM +
            '</body></html>';
            
            //convert to RDF
            var parser = new DOMParser();
            var parsedDOM = parser.parseFromString(serializedDOM, "text/xml");
            var xsltPath = ORYX.PATH + "lib/extract-rdf.xsl";
            var xsltProcessor = new XSLTProcessor();
            var xslRef = document.implementation.createDocument("", "", null);
            xslRef.async = false;
            xslRef.load(xsltPath);
            xsltProcessor.importStylesheet(xslRef);
            //try {
                var rdf = xsltProcessor.transformToDocument(parsedDOM);
                var serialized_rdf = (new XMLSerializer()).serializeToString(rdf);
                //			serialized_rdf = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + serialized_rdf;
                
                // Send the request to the server.
                new Ajax.Request(ORYX.CONFIG.VALIDATOR_URL, {
                    method: 'POST',
                    asynchronous: false,
                    parameters: {
                        resource: location.href,
                        data: serialized_rdf
                    },
                    onSuccess: function(request){
						var result = Ext.decode(request.responseText);
						conflictingNodes = result.conflictingNodes;
						leadsToEnd = result.leadsToEnd
						
						if(!leadsToEnd){
							Ext.Msg.alert("Oryx", "The process will never reach a final state!")
						} else if(conflictingNodes.size() > 0) {
							conflictingNodes.each(function(node){
								sh = this.facade.getCanvas().getChildShapeByResourceId(node.id);
								if (sh) {
									this.raiseOverlay(sh, "Some following pathes will never reach a final state!");
								}
							}.bind(this));
							this.active = !this.active;
						}
						else {
							Ext.Msg.alert("Oryx", "No validation errors found!")
						}
					}.bind(this)
                });
                
            //} 
            //catch (error) {
            //    this.facade.raiseEvent({
            //        type: 'loading.disable'
            //    });
            //    Ext.Msg.alert("Oryx", error);
            //}
            
        }
        
    },
    
    raiseOverlay: function(shape, errorMsg){
    
        var id = "syntaxchecker." + this.raisedEventIds.length;
        
        var cross = ORYX.Editor.graft("http://www.w3.org/2000/svg", null, ['path', {
            "title": errorMsg,
            "stroke-width": 5.0,
            "stroke": "red",
            "d": "M20,-5 L5,-20 M5,-5 L20,-20",
            "line-captions": "round"
        }]);
        
        this.facade.raiseEvent({
            type: "overlay.show",
            id: id,
            shapes: [shape],
            node: cross,
            nodePosition: shape instanceof ORYX.Core.Edge ? "START" : "NW"
        });
        
        this.raisedEventIds.push(id);
        
        return cross;
    }
    
});