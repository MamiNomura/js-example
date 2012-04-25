/**
 * @author Michael Arick (marick@convio.com)
 * @version $Id: tree.js,v 1.6 2011/02/14 21:28:36 marick Exp $
 *
 * The javascript and YUI code for the Trees of the Item Chooser dialog
 */

YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser.Tree = {
  loadDataForNode : function(node, onCompleteCallback) {
    //We're going to retrieve a JSON that has the contents of this node.
    //Essentially, this means the name, ID of the current node, and the name, id, and "isLeaf" of any children.
    var callback = {
      success: function(o) {
        var response = YAHOO.lang.JSON.parse(o.responseText);

        //Remove all the children from the currently expanding node.
        node.tree.removeChildren(node);

        //Get the "FolderAndChildren" part of the response.
        var folderAndChildren = response["FolderAndChildren"]; 
        //Get the nodes array called "children"
        var nodes = folderAndChildren["children"];

        for (var i=0 ; i<nodes.length; i++) {
          var nodeInfo = nodes[i];
          var isLeafValue = (nodeInfo["isLeaf"] == "true");
          var isRestrictedValue = (nodeInfo["isRestricted"] == "true");
 
          //For each node found, create a text node and attach it to the parent being expanded.
          var newNode = new YAHOO.widget.TextNode({label: nodeInfo["label"], expanded: false, id: nodeInfo["id"], isLeaf:isLeafValue, className:(isRestrictedValue)?"restricted":""}, node);
        }
        //the YUI code calls "loadDataForNode" and includes a callback function.  after setting up the subtree, call it to show the new nodes.
        onCompleteCallback();

        // Mark the item chooser as ready if tree is used in the itemchooser
        if (YAHOO.convio.itemchooser.ChooserUtil) {
          YAHOO.convio.itemchooser.ChooserUtil.ready = true;
        }
      },
      failure: function(o) {
        //This should never happen, but if it does, we want to know.
        window.alert("ERROR: FAILED TO GET A RESULT FOR FOLDER " + folderID + "!!!"); 
      }
    };

    var folderID = node.data.id;
    var url = "/components/x-dialog/chooser/tree/children-retrieve.jsp?folderID=" + folderID;
    YAHOO.util.Connect.asyncRequest('POST', url, callback);
  },
  setupRootNode : function(tree, rootFolderID, postCallback, selectedFolderID) {
    //We're going to retrieve a JSON that has the contents of this node:
    //Essentially, this means the name, ID of the current node, and the name, id, and "isLeaf" of any children.
    var callback = {
      argument: {
        callback : postCallback,
        selectedID : selectedFolderID
      },
      success: function(o) {	  
        //When we get a succcessful reply:
        //Remove all the children from the root node.
        tree.removeChildren(tree.getRoot());
        //Parse the response from JSON into a javascript object
        var response = YAHOO.lang.JSON.parse(o.responseText);
        //Get the "FolderAndChildren" part of the response.
        var folderAndChildren = response["FolderAndChildren"]; 
        //Create a new root node (really the only child of the tree's root).  This will be expanded.
        //These extra label and id are passed by children-retrieve.jsp specifically so they could be used in this way.
        var newRoot = new YAHOO.widget.TextNode({
            label : folderAndChildren["label"],
            id : folderAndChildren["id"],
            expanded : true
          }, tree.getRoot());	      
        //Now get the nodes array called "children"
        var nodes = folderAndChildren["children"];
        for (var i=0; i<nodes.length; i++) {
          var nodeInfo = nodes[i];
          var isLeafValue = (nodeInfo["isLeaf"] == "true");
          var isRestrictedValue = (nodeInfo["isRestricted"] == "true");
 
          //For each node found, create a text node and attach it to the root node we created earlier.
          var newNode = new YAHOO.widget.TextNode({label: nodeInfo["label"], id: nodeInfo["id"], expanded: false, isLeaf: isLeafValue, className: (isRestrictedValue)?"restricted":""}, newRoot);
        }
        //In this case, WE have to call render ourselves, because this was a call made by US, not YUI
    	tree.render();

    	if (o.argument.callback) {
          YAHOO.log("Calling a function on " + o.argument.selectedID);
    	  o.argument.callback(o.argument.selectedID);
    	  YAHOO.log("Called a function on " + o.argument.selectedID);
    	}

        // When dialog contents are dynamically resized, sometimes the dialog needs to
        // be redrawn.
        YAHOO.convio.dialog.redraw();
      },
      failure: function(o) {
        //We never expect this to fail, but if it does, we want to know
        window.alert("ERROR: FAILED TO GET A RESULT FOR FOLDER " + rootFolderID + "!!!"); 
      }
    };

    var url = "/components/x-dialog/chooser/tree/children-retrieve.jsp?folderID=" + rootFolderID;
    YAHOO.util.Connect.asyncRequest('POST', url, callback);
  }
}
