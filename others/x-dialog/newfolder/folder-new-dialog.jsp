<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.pagelet.*,
                 com.frontleaf.content.Folder,
                 com.frontleaf.content.template.Wrapper,
                 com.frontleaf.content.template.WrapperStore,
                 com.frontleaf.content.template.WrapperTools,
                 com.frontleaf.sql.*,
                 com.frontleaf.util.RequestParameterMap,
                 com.frontleaf.util.StringTools,
                 com.frontleaf.util.PropertyMap,
                 java.io.IOException,
                 java.util.Iterator,
                 java.util.List"%>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>

<rc:request>
  <parameter name="parentID" type="folder"/>
</rc:request>

<%
  String contextPath = request.getContextPath();

  Folder parent = (Folder) requestData.getObject("parentID");

  Integer folderID = IdFactory.getInstance().newId();

  PropertyMap hostConfig = parent.getHost().getConfiguration();
  String separator =  hostConfig.getString("com.frontleaf.folder.separator", "-");
  // Only allow underscore or hypen as the separator
  if (!"_".equals(separator) && ! "-".equals(separator)) {
    separator = "-";
  }
%>

<ui:dialog>
<ui:title>New Folder</ui:title>
<ui:init>
  function _getElement(formName, elementName) {
    var form = document.forms[formName];
    if (! form) { 
      alert("No such form " + formName);
      return null;
    }

    var element = form.elements[elementName];
    if (! element) { 
      alert("No such element " + elementName);
      return null;
    }
    return element;
  }

  function _labelToFileName(label, separator) {
    if (! separator) {
      separator = "-";
    } 
    var name = label.toLowerCase();
    name = name.replace(/\s/g, separator);
    name = name.replace(/[^a-zA-Z0-9-_]/g, "");
    return name;
  }
  
  function _copyTitleToURL(separator) {
    var systemName = _getElement("form", "systemName");
    var title = _getElement("form", "title");
    if (systemName.value || ! title.value) { return; }

    systemName.value = _labelToFileName(title.value, separator);
  }

  function copyTitleToURL(e) {
    _copyTitleToURL('<%=separator %>');
  }  
  
  YAHOO.util.Event.on("folder_new_dialog_title_input", "focusout", copyTitleToURL);
</ui:init>
<ui:validate>
   <%@include file="folder-new-custom-validate.jspi"%>
    var data = YAHOO.convio.dialog.getFormData();
    if (! data.title || data.title.match(/^\s*$/)) {
      YAHOO.convio.dialog.addError("title", "Please enter a title for the folder.");
      return;
    }
    
    if (data.title.length > 1000) {
      YAHOO.convio.dialog.addError("title", "Folder title must be fewer than 1000 characters.");
      return;
    }

   if (! data.systemName || data.systemName.match(/^\s*$/)) {
     YAHOO.convio.dialog.addError("systemName", "Please enter a URL name for the folder.");
     return;
   }
    
   if (data.systemName.length > 100) {
     YAHOO.convio.dialog.addError("systemName", "Folder URL name must be fewer than 100 characters.");
     return;
   }

   if (data.systemName && !YAHOO.convio.form.checkPattern(data.systemName, /^[\.\-_a-z0-9A-Z]+$/)) {
     YAHOO.convio.dialog.addError("systemName", 
        "The folder URL name should only have alphanumeric characters, dashes and underscores.");
     return;
   }
    
   //validate the custom components from included page
   if (!validateCustom(data)) {
     YAHOO.convio.dialog.addError("The custom fields were not entered correctly.");
     return;
   }
   if (YAHOO.convio.form.isReservedName(data.systemName)) {
     YAHOO.convio.dialog.addError("systemName",
        "The URL name \"" + data.systemName + 
        "\" is reserved for system use.  Please choose another name.");
   }  
</ui:validate>
<ui:body>
  <form name="form" id="new_folder_form" action="/components/x-dialog/newfolder/folder-new-finish.jsp">

    <input type="hidden" name="parentID" value="<%=parent.getID()%>">
    <input type="hidden" name="folderID" value="<%=folderID%>">

    <table id="bodyContainer" style="position:relative">
      <thead>
      <tr>
	<th>
	  <span class="sectionHead">
            New Folder in "<%=parent.getTitle()%>"
          </span>
	</th>
      </tr>
      </thead>
      <tbody>
<tr class="element">
<th>Folder title:</th>
</tr>
<tr class="element">
<th>
 <input name="title" id="folder_new_dialog_title_input" style="width:360px">
    <ui:error id="title"/>
</th>
</tr>
<tr class="element">
    <th>Folder URL name (no spaces or special characters):</th>
</tr>
<tr class="element">
<th>
 <input name="systemName" style="width:360px">
    <ui:error id="systemName"/>
</th>
</tr>

<%
  if (!WrapperTools.hideWrappers()) {
    List<Wrapper> wrappers = 
      WrapperStore.getInstance().searchWrappers(parent.getSubsite(),null);
    if ( wrappers != null && !wrappers.isEmpty() ) {
%>

<tr class="element">
    <th>Default Wrapper:</th>
</tr>
<tr class="element">
<th>
 <select name="wrapperName">
   <option value="">(Inherit from Parent Folder)</option>

<% for (Wrapper i : wrappers) { %>
  <option value="<%=i.getName()%>"><%=i.getLabel()%></option>
<% } %>

 </select>
</th>
</tr>
<%
    } // if wrappers != null
  }
%>


<tr class="element">
    <th>
<input id="createIndex" type="checkbox" name="createIndex" value="true">
<label for="createIndex">Create an index page for the new folder</label>
  </th>
</tr>
<%@include file="folder-new-custom.jspi"%>
 </tbody>
	  </table>
	</td>
      </tr>
      </tfoot>
    </table>
    </form>
</ui:body>

</ui:dialog>