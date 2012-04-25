/**
 * @author Michael Pih (mpih@convio.com)
 * @version $Id: links.js,v 1.6 2012/02/04 01:27:41 mpih Exp $
 *
 * The javascript and YUI code for the Links panel of the Chooser dialog
 */
YAHOO.namespace("convio.itemchooser");
YAHOO.convio.itemchooser.LinksPanel = {
  ddSelectedTarget : null,
  
  doSetup : function() {
    var l = YAHOO.convio.itemchooser.LinksPanel;
    l.ddSelectedTarget = new YAHOO.util.DDTarget("SelectedLinks");
    l.loadStartingLinks();
    YAHOO.example.DDList.finishDragDropFunction = YAHOO.convio.itemchooser.LinksPanel.finishDragDropOnListItem;

      YAHOO.convio.dialog.redraw();
  },  
  
  finishDragDropOnListItem : function(id, sourceElement, destinationList, insertBefore, destinationDDTarget) {
    if (id.indexOf("_breadcrumb") > -1) {
      //OK, we need to be careful here:
      if (sourceElement.parentNode.id == "SelectedLinks") {
        //Reordering:
        destinationList.insertBefore(sourceElement, insertBefore);
      }
    }
    YAHOO.convio.itemchooser.LinksPanel.setReturnValue(destinationList);
  },

  createLink : function(id, title, thumbnailURL, iconURL) {
    var breadcrumbNode = YAHOO.convio.itemchooser.LinksPanel.createBreadcrumb(id, title, thumbnailURL, iconURL);
    breadcrumbNode.innerHTML = YAHOO.convio.itemchooser.LinksPanel.addTrashIcon(breadcrumbNode.innerHTML, breadcrumbNode.id);
    return breadcrumbNode;
  },

  //OK, the links will be on the right side of the page no matter which tab appears:
  addLink : function(id, title, thumbnailURL, iconURL) {
    var linkNode = YAHOO.convio.itemchooser.LinksPanel.createLink(id, title, thumbnailURL, iconURL);
    //Check that it isn't already there:
    var destinationList = document.getElementById("SelectedLinks");
    if (!YAHOO.convio.itemchooser.LinksPanel.listHasElement(destinationList, linkNode) ) {
      destinationList.appendChild(linkNode);
      var ddItem = new YAHOO.example.DDList(linkNode);
    }
    YAHOO.convio.itemchooser.LinksPanel.setReturnValue(destinationList);
    
  },

  setReturnValue : function(list) {
    var entries = YAHOO.util.Dom.getChildren(list);    
    var returnValue = [];
    
    //thumbnail, title, id, icon
    for (var i = 0 ; i < entries.length ; i ++) {
      var entry = {};
      entry.thumbnail = entries[i].getAttribute("thumbnail");
      entry.id = entries[i].id.substring(0, entries[i].id.indexOf("_breadcrumb"));
      entry.icon = entries[i].getAttribute("icon");
      entry.title = entries[i].title;
      returnValue.push(entry);
    }
    var args = YAHOO.convio.dialog.getArgs();
    args.returnValue = returnValue;
  },
  
  loadStartingLinks : function() {
    var args = YAHOO.convio.dialog.getArgs();
    var links = args.links;
    for (var i = 0 ; i < links.length ; i ++) {
      var link = links[i];
      YAHOO.convio.itemchooser.LinksPanel.addLink(link.id, link.title, link.thumbnail, link.icon);
    }      
  },
  
  createBreadcrumb : function(id, title, thumbnailURL, iconURL) {
    var newNode = document.createElement("LI");
    newNode.id = id + "_breadcrumb";
    newNode.name = title;
    newNode.title = title;
    newNode.setAttribute("thumbnail", thumbnailURL);
    newNode.setAttribute("icon", iconURL);
    if (YAHOO.convio.itemchooser.ChooserUtil.baseType && 
        YAHOO.convio.itemchooser.ChooserUtil.baseType == "image") {
      newNode.innerHTML = '<img src="' + thumbnailURL + '" class="thumbnail" align="absmiddle" /><span class="linkTitle">' + title + '</span>';
    } else {
      newNode.innerHTML = '<img src="' + iconURL + '" class="thumbnail" align="absmiddle"/><span class="linkTitle">' + title + '</span>';
    }
    return newNode;
  },
  
  addTrashIcon : function(innerHTML, id) {
    var newInnerHTML = innerHTML + '<a href="#" class="delete" onclick="YAHOO.convio.itemchooser.LinksPanel.deleteSelection(' + "'" + id + "'" + ');"><img src="/assets/icons/16x16/delete.png" align="absmiddle" /></a>';
    return newInnerHTML;
  },
  
  listHasElement : function(list, element) {  
    var childNodes = YAHOO.util.Dom.getChildren(list);
    for (var i = 0 ; i < childNodes.length ; i ++) {
      if (childNodes[i].nodeName == element.nodeName &&
          childNodes[i].className == element.className &&
          childNodes[i].id == element.id) {
        return true;
      }
    }
    return false;     
  },
  
  deleteSelection : function(id) {
    var element = document.getElementById(id);
    element.parentNode.removeChild(element);
    var destinationList = document.getElementById("SelectedLinks");
    YAHOO.convio.itemchooser.LinksPanel.setReturnValue(destinationList);
  }
  
  
  
};
