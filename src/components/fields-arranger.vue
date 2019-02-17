<template>
  <v-error
    v-if="groupedFields.length === 0"
    :title="$t('no_fields')"
    :body="$t('no_fields_body')"
    icon="error_outline"
  />
  <form v-else class="v-form flex-group" @submit.prevent>

  <v-checkbox
    id="showGuidesCol"
    :checked="showGuidesCol"
    label="Show column guides"
    @change="showGuidesCol = !showGuidesCol"
    value="showGuidesCol"
  />
  <v-checkbox
    id="showGuidesBound"
    :checked="showGuidesBound"
    label="Show boundary guides"
    @change="showGuidesBound = !showGuidesBound"
    value="showGuidesBound"
  />
  <v-checkbox
    id="RTL"
    :checked="RTL"
    label="Right to Left (need dir='rtl' in html tag)"
    @change="RTL = !RTL"
    value="RTL"
  />

  <v-checkbox
    id="mode"
    :label="mode"
    value="mode"
    @change="changeMode()"
  />
  
  <draggable v-model="sortOrder"
  :options="{chosenClass:'focus',
  disabled: isDraggingWidth,
  sort: (mode == 'sort'),
  scroll:true,
  scrollSensitivity:100
  }"
  :class="{
  'grid' : true,
  'guideColumn' : showGuidesCol,
  'RTL' : RTL,
  }"
  @click="log"
  @start="startDrag"
  @end="saveSort"
  >
  <div :ref="ref(field.id)" :class="{'outer': true}"
    v-for="field in sortOrder"
      :key="field.field"
    draggable
    @dragstart="dragField($event, field)"
    @dragend="isDragging = false"
      >
    <div
      :class="[
        'inner',
        isGroup(field) ? null : `col-${field.width || 4}`,
        isGroup(field) ? 'group' : 'field',
        {'guideBound': showGuidesBound}
      ]"
   :style="width(field)"
   @click="clickField(field)"
    draggable
    @drop="drop($event, field)"

    >
      <aGroup
        v-if="isGroup(field)"
        :values="{}"
        :field="field"
        :readonly="true"
        :mode="mode"
        :iteration="1"
        :drag="isDragging"
      />
    <!--@activate="activateField"
        @deactivate="deactivateField"
        @stage-value="$emit('stage-value', $event)" -->
      <v-field
        v-else
        :name="field.id + '-' + field.field"
        :field="field"
        :values="{}"
        :fields="{fields}"
        :readonly="true"
        :blocked="false"
        :batch-mode="false"
        :new-item="false"
      />
      <!--         @activate="activateField"
        @deactivate="deactivateField"
        @stage-value="$emit('stage-value', $event)" -->
   

      <div class="drag-handle right"
        draggable
        @dragstart="dragStart($event, ref(field.id), true)"
        @drag="drag($event, true)"
        @dragend="dragEnd($event, field.field, ref(field.id), true)">
      </div>

      <div class="drag-handle left"
        draggable
        @dragstart="dragStart($event, ref(field.id), false)"
        @drag="drag($event, false)"
        @dragend="dragEnd($event, field.field, ref(field.id), false)">
      </div>


    </div>


</div>

  </draggable>
</form>
</template>

<script>
import VField from "./form/field.vue"
import VGroup from "./form/group.vue";
import VError from "./error.vue";
import VForm from "./form/form.vue";
import aGroup from "./arranger.vue";
import { defaultFull } from "../store/modules/permissions/defaults";

export default {
  name: "v-fields-arranger",
  components:{
    VField,
    VGroup,
    VError,
    aGroup
  },
  metaInfo() {
    return {
      title: "Arrange"
    }
  },
  props: {
    fields: {
      type: Array,
      required: true
    },
    collection: {
      type: String,
      required: true
    }
  },
  created(){
      this.$root.$on('addNode', (i, n) => this.addNode(i,n));
  },
  watch: {
    fields(n) {
      if (n != null) {
        this.sortInit(this.fields);
        this.groupInit();
        console.log(this.groups);
      }
    }
  },
  data() {
    return {
      isDragging: false,
      isDraggingWidth: false,
      mousedown: false,
      initialX: null,
      initialY: null,
      xPos1:null,
      xPos2:null,
      yPos1:null,
      targetField:null,
      elementWidth: 0,
      waiter:false,

      dragSource: null,

      widths: {},
      sortOrder: null,
      groups: null,

      showGuidesCol: true,
      showGuidesBound: true,

      RTL: false,

      dummyRadios: null,

      mode: "sort", // other option is "group" for creating groups
    }
  },
  computed: {
    permissions() {
      return defaultFull;
    },
    groupedFields() {
          const fieldsArray = Object.values(this.fields).filter(
            field =>
              this.permissions.read_field_blacklist.includes(field.field) === false
          );
    
          const result = fieldsArray
            .filter(field => field.type && field.type.toLowerCase() === "group")
            .map(group => ({
              ...group,
              children: []
            }));
    
          const nonGroupFields = fieldsArray.filter(
            field => field.type && field.type.toLowerCase() !== "group"
          );
    
          nonGroupFields.forEach(field => {
            if (field.group != null) {
              const groupIndex = this.$lodash.findIndex(
                result,
                group => group.id === field.group
              );
              return result[groupIndex].children.push(field);
            }
    
            return result.push(field);
          });
    console.log(result);
          return result
            .filter(
              field => field.hidden_detail === false || field.hidden_detail == "0"
            )
            .sort((a, b) => {
              if (a.sort == b.sort) return 0;
              if (a.sort === null) return 1;
              if (b.sort === null) return -1;
              return a.sort > b.sort ? 1 : -1;
            });
    }
  },
  methods: {
    addNode(id, node){
      this.groups[id].insertnode = node;
      console.log(this.groups[id].insertnode = node)
      console.log(this.groups);
    },
    isGroup(field) {
      return field.children && Array.isArray(field.children);
    },
    clickField(field){
      this.$emit("edit", field)
      //console.log(field);
    },
    changeMode(){
      if (this.mode == "sort") {
        this.mode = "group";
      } else{
         this.mode = "sort";
      }
    },
    drag(e, R){
        this.xPos2 = (e.screenX);

          if (this.xPos2 != 0) {
          var delta = (this.xPos2 - this.xPos1) * (R ? 1 : -1); // Left side delta is opposite of right
          var wtf = this.elementWidth + delta;

         // console.log(e.target.parentElement);

          e.target.parentElement.style="width:"+ wtf +"px;max-width:(--width-x-large);"
          this.elementWidth = e.target.parentElement.clientWidth;
          this.xPos1 = this.xPos2;
       }
    },
    dragStart(e, parentReference, R){
      this.isDraggingWidth = true;
      e.dataTransfer.setData('Text', 'node'); // Firefox...
      e.dataTransfer.effectAllowed = "move";

        this.elementWidth = e.target.parentElement.clientWidth;
        this.initialX = this.xPos1 = (e.clientX || e.screenX);
        this.initialY = this.xPos2 = (e.clientY || e.screenY);

      if (!R) {// left handlebar
        this.$refs[parentReference][0].style = "margin-left: auto;";
      } else if (R && this.RTL) {
        this.$refs[parentReference][0].style = "margin-right: auto;"
      }
    },
    dragEnd(e, fieldName, parentReference, R) {
      this.isDraggingWidth = false;
        this.xPos2 = (e.clientX || e.screenX);
        var delta = (this.xPos2 - this.xPos1) * (R ? 1 : -1);
        
        if (!R || this.RTL) { // left side handlebar
         this.$refs[parentReference][0].style = null;
        }

        var final = e.target.parentElement.clientWidth + delta;
        e.target.parentElement.style="width:var(--width-"+ this.pixelToWidth(final) +");max-width:(--width-x-large);"

      this.widths[fieldName] =  final;
      console.log('end');
    },
    dragField(event, field) {
      if (this.isDragging) return;
      this.isDragging = true;
      this.dragSource ={
          "id" : field.id,
          "node" : event.target
      } 
      console.log(this.dragSource);
    },
    dropped(target, fieldID) {
      this.groups[fieldID].push(this.dragSource.ID);
      target.appendChild(this.dragSource.node);
            console.log("transfered");
    },
    drop(event, field){
      if (this.mode == "group") {
        if (field.type == "group" && !this.groups[field.id].children.hasOwnProperty(this.dragSource.id)) {
          console.log("in");
          this.groups[field.id].children[this.dragSourceid] = this.dragSource.node;
                (this.groups[field.id].insertnode).appendChild(this.dragSource.node);
        }
      }
    },
    log() {
      console.log(Object.values(this.sortOrder));
    },
    startDrag(event) {
      if (this.mode == "group") {
        //todo
       // console.log(event);
      }
    },
    saveSort() {
      if (this.mode == "sort") {
        this.sortOrder.forEach((item, index) => {
          item.sort = index
        });
      } else {
        //todo
      }
    },
    width(field) {
        var w = "";

        if (this.widths[field.field]) {
          w = this.pixelToWidth(parseInt(this.widths[field.field]));
          return "width:var(--width-"+ w +");max-width:var(--width-"+ w +");"; 

        } else {

          switch (field.width) {
            case 1:
            default:
              w = "small"
              break;
            case 2:
              w = "medium"
              break;
            case 3:
              w = "large"
              break;
            case 4:
              w = "x-large"
              break;
          }

          return "width:var(--width-"+ w +");max-width:var(--width-"+ w +");"; 

        }
},
    pixelToWidth(pix) {
      var w = 0;
      const variance = 50; // +- variance
      if (pix <= (140 + variance)) {
         return "small";
      } else if (pix <= (300 + variance)) {
        return "medium";
      } else if (pix <= (460 + variance)) {
        return "large";
      } else {
        return "x-large";
      }
    },
    fieldset(interfaceName) {
      const interfaceInfo = this.$store.state.extensions.interfaces[
        interfaceName
      ];

      return (interfaceInfo && interfaceInfo.fieldset) || false;
    },
    hideLabel(fieldName) {
      const interfaceName = fieldName;
      const interfaceMeta = this.$store.state.extensions.interfaces[
        interfaceName
      ];

      if (!interfaceMeta) return false;

      if (interfaceMeta && interfaceMeta.hideLabel)
        return interfaceMeta.hideLabel;

      return false;
    },
    optionWidth(field) {
      if (field.options == null) {return false};
      if (Object.keys(field.options).length > 0) {
        if (field.options.width) {
          return field.options.width;
        }
      } else {
        return false;
      }
    },
    dummyRelation(field) {
        switch (field.type.toLowerCase()) {
          case "m2m":
          case "o2m":
          case "translation":
            return {"filler":"error"};
            break;
          default:
            return null;
            break;
        }
    },
    dummyStatus(field) {
      if (field.type == "status") {
        this.dummyRadios = field.options.status_mapping;
        return true;
      }
      return false;
    },
    sortInit(){

      this.sortOrder = [];
      this.groupedFields.forEach(field => {
          this.sortOrder.push(field);
       });

    },
    groupInit(){
      var groupList = {};
      this.groupedFields.filter(f => f.type == "group")
        .forEach(gField => {
          var children = {};
          gField.children.forEach(c => {
            children[c.id].push({});
          });

          groupList[gField.id] = {
            "insertnode" : {},
            "children": children,
          }
       });

       this.groups = groupList; // groups[fieldID] : array of children's IDs
    },
    ref(id){
      return "field-"+id;
    }
  }
};
</script>

<style lang="scss" scoped>
.grid {
  position:relative;
  display:flex;
  flex-flow:row wrap;

  border: 5px var(--lighter-gray) dashed;
  border-collapse:collapse;
  padding:10px 0;
  max-width:calc(var(--width-x-large) + 30px);

  color: var(--light-gray);

  &.guideColumn {
    background-size:161px 170px;
    background-image:
      linear-gradient(to right, transparent,
      transparent 159px,
      var(--lightest-gray) 159px,
      var(--lightest-gray));
  }
}

.col {
  border: 5px var(--lighter-gray) dashed;
  width: var(--width-small);
  flex-basis: var(--width-small);
  height:100%;
  margin-right:20px;
}

/deep/ .drag-handle {
  width: 10px;
  height: 100%;
  cursor: col-resize;
  position: absolute;

  bottom:0;
  opacity: 0;

  z-index:10;

  &.right {
   right:-3px;
  }

  &.left{
    left:-3px;
  }
}

.dummy-status {

  & > div{
  display: inline-block;
  margin-right: 40px;
  margin-bottom: 20px;
  }
}

i {
    color: var(--accent);
    vertical-align: super;
    font-size: 7px;
  }

fieldset,
p {
  border: 0;
  padding: 0;
}

fieldset > div,
p {
  display: flex;
  flex-direction: column;
}

// .outer{
//   position:relative;
//   box-sizing:content-box;
//   border:2px transparent solid;
//   border-collapse:collapse;

//   &.guideBound {
//   border-color: var(--lighter-gray);
//   border-style: dashed;
// }

//   &.focus {
//     opacity:1;
//     border:2px var(--accent) solid;
//     border-collapse:collapse;
//   }
// }

.inner{
  position:relative;
  cursor:grab !important;
  margin:0 8px 50px 8px;
  border:2px transparent solid;
  box-sizing:content-box;
  opacity:0.6;
  transition: opacity var(--fast) var(--transition-out);

  max-width:100%;

  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &:hover, &:focus, &:active {
  opacity:1;
  }

  &.guideBound {
  border-color: var(--lighter-gray);
  border-style: dashed;
  }
}

.focus .inner {
    opacity:1;
    border:2px var(--accent) solid;
    border-collapse:collapse;
}

.hidden{
  visibility:hidden;
  display:none;
}

.interface {
  position:relative;
  max-width: 100%;

  & button {
  margin-left:0 !important;
  }

  /deep/ .v-ext-input {
  cursor:grab !important;
  pointer-events:none;
  }
}




small {
  order: 2;
  display: block;
  margin-top: 4px;
  font-style: italic;
  font-size: 12px;
  line-height: 1.5em;
  text-overflow: ellipsis;
}

.wrapper {

}
</style>