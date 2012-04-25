<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-tree/category-tree-dialog.jsp,v $
 $Author: mpih $
 $Revision: 1.2 $
 $Date: 2011/03/25 17:27:47 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.category.Category,
                 com.frontleaf.category.CategoryPathIterator,
                 com.frontleaf.security.User,
                 com.frontleaf.server.Host" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>

<rc:request>
  <parameter name="hostID" type="integer"/>
  <parameter name="categoryID" type="integer" required="false"/>
</rc:request>

<%
  User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  Integer hostID = requestData.getInteger("hostID");
  Host host = Host.find(hostID);

  if (! host.isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN);
    return;
  }

  Integer categoryID = requestData.getInteger("categoryID");
  Category category = null;
  if (categoryID != null) {
    category = Category.find(categoryID);
  }
%>

<ui:dialog>
<ui:title>Choose A Category</ui:title>
<ui:init>
  var args = YAHOO.convio.dialog.getArgs();
  var gRootCategoryID = <%=host.getRootCategory().getID()%>;

  var gCategoryID = <%=(category != null) ? category.getID() : null%>;

  // Add the user prompt.
  if (args.prompt) {
    YAHOO.util.Dom.get("userPrompt").innerHTML = args.prompt;
  }

  var gExpandIDs = [];
<%
  // If a default category is passed in, generate a JS stack of
  // categoryIDs representing the 
  if (category != null && ! category.equals(host.getRootCategory())) { 
    CategoryPathIterator i = category.getPathIterator(); 
    while (i.hasNext()) { 
      Category next = i.nextCategory(); 
      if (next.equals(host.getRootCategory())) {
        continue;
      }
%>
  gExpandIDs.push(<%=next.getID()%>);
<%
    }  // end: while (i.hasNext())
  }
%>


  // Initialize the document tree.
  var gCategoryTree = new YAHOO.convio.tree.CategoryTree({
      id: "categoryTree", 
      rootID: gRootCategoryID,
      categoryID: gCategoryID,
      expandIDs: gExpandIDs
    });
  gCategoryTree.onChange = function() {
    var selectedNode = gCategoryTree.getSelectedNode();
    args.category = selectedNode ? selectedNode.data : null;
  };
</ui:init>
<ui:validate>
  var gCategoryTree = YAHOO.convio.tree.get("categoryTree");
  var selectedNode = gCategoryTree.getSelectedNode();
  if (! selectedNode) {
    YAHOO.convio.dialog.addError("selectedCategory", "Please select a category.");
  }
</ui:validate>
<ui:body>

<ui:error id="selectedCategory" />

<span id="userPrompt"></span>

<div id="categoryTree" class="categoryTree"></div>

</ui:body>
</ui:dialog>