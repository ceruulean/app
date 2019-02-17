<template>
  <v-ext-input
    :id="field.field"
    :name="field.field"
    :options="field.options"
    :type="field.type"
    class="v-a-group flex-group"
    ref="appendN"
  >
      <div
        v-for="child in field.children"
        :class="[
          isGroup(child) ? null : `col-${child.width}`,
          isGroup(child) ? 'group' : 'field'
        ]"
        :key="child.field"
   :style="width(field)"
      >
        <v-a-group
          v-if="isGroup(child)"
          :values="values"
          :field="child"
          :new-item="newItem"
          :iteration="(iteration + 1)"
        />
        <v-field
          v-else
          :readonly="readonly"
          :values="values"
          :field="child"
          :blocked="batchMode && !activeFields.includes(field.field)"
          :batch-mode="false"
          :new-item="newItem"
        />


      <div class="drag-handle right"
        draggable
        @dragstart="dragStart($event, ref(field.id), true)"
        @drag="dragWidth($event, true)"
        @dragend="dragEnd($event, field.field, ref(field.id), true)">
      </div>

      <div class="drag-handle left"
        draggable
        @dragstart="dragStart($event, ref(field.id), false)"
        @drag="dragWidth($event, false)"
        @dragend="dragEnd($event, field.field, ref(field.id), false)">
      </div>


      </div>
  </v-ext-input>
</template>

<script>
import VField from "./form/field.vue";

export default {
  name: "v-a-group",
  components: {
    VField
  },
  props: {
    values: {
      type: Object,
      required: true
    },
    field: {
      type: Object,
      required: true
    },
    readonly: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String,
      default: "sort"
    },
    activeFields: {
      type: Array,
      default: () => []
    },
    iteration: {
      type: Number,
      default: 0
    },
    drag: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      dragSource: null,
      groups: null,
      widths: {},

      xPos1: 0,
      xPos2: 0,
      elementWidth: 0,
      initialX: 0,

      isDraggingWidth: false,
    }
  },
  watch: {
    drag() {
      console.log(this.$refs.appendN.$el);
      this.$root.$emit("addNode", this.field.id, this.$refs.appendN.$el);
    }
  },
  methods: {
    isGroup(field) {
      return field.children && Array.isArray(field.children);
    },
    click(){
      alert("hello");
    },
    dragWidth(e, R){
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

      this.widths[fieldName] = final;
      console.log('end');
    },
    dragField(event, field) {
      this.dragSource ={
          "id" : field.id,
          "node" : event.target
      } 
      console.log(this.dragSource);
    },
    drop(field){
      if (this.mode == "group") {
        //console.log(this.$refs);
        if (field.type == "group") {
            this.$emit('dropped', this.$refs.appendNode[0], field.id);
            console.log("emitted");
        } else { 
        }
      }
    },
    width(field) {
        var w = "";
        var z = "z-index:"+this.iteration+";";

        if (this.widths[field.field]) {
          w = this.pixelToWidth(parseInt(this.widths[field.field]));
          return z + "width:var(--width-"+ w +");max-width:var(--width-"+ w +");"; 

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

          return z + "width:var(--width-"+ w +");max-width:var(--width-"+ w +");"; 

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
  ref(id){
      return "field-"+id;
    }
  }
};
</script>

<style scoped>
.group{
  position:relative;
  z-index: 1;
  box-sizing:content-box;
}

.field {
  position:relative;
  z-index: 2;
}
</style>