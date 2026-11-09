var ScarfData = {
  selectLimit: 6,
  roundSize: 18,
  vendor: {
    name: "천 가게 주인 이슬",
    success: "여섯 장 모두 다른 디자인이네요.",
    fail: "같은 디자인이 섞여 있어요. 표시된 카드를 봐 주세요."
  },
  catalog: [
    {
      designId: "wave",
      name: "물결무늬",
      variants: [
        { colorName: "남색", color: "#1e4d7b", image: "scarf_img/scarf_set02_pair01_A.png" },
        { colorName: "모래색", color: "#d08a4c", image: "scarf_img/scarf_set02_pair01_B.png" }
      ]
    },
    {
      designId: "stripe",
      name: "줄무늬",
      variants: [
        { colorName: "먹색", color: "#2c2c2c", image: "scarf_img/scarf_set02_pair02_A.png" },
        { colorName: "눈색", color: "#f3ead7", image: "scarf_img/scarf_set02_pair02_B.png" }
      ]
    },
    {
      designId: "dot",
      name: "점무늬",
      variants: [
        { colorName: "솔색", color: "#2f6b4f", image: "scarf_img/scarf_set02_pair03_A.png" },
        { colorName: "국화색", color: "#e0b325", image: "scarf_img/scarf_set02_pair03_B.png" }
      ]
    },
    {
      designId: "check",
      name: "체크무늬",
      variants: [
        { colorName: "쪽빛", color: "#3d4a8a", image: "scarf_img/scarf_set02_pair04_A.png" },
        { colorName: "감색", color: "#c45c26", image: "scarf_img/scarf_set02_pair04_B.png" }
      ]
    },
    {
      designId: "floral",
      name: "꽃무늬",
      variants: [
        { colorName: "자두색", color: "#8c3d5b", image: "scarf_img/scarf_set02_pair05_A.png" },
        { colorName: "옥색", color: "#3f8f86", image: "scarf_img/scarf_set02_pair05_B.png" }
      ]
    },
    {
      designId: "leaf",
      name: "잎사귀무늬",
      variants: [
        { colorName: "이끼색", color: "#3f6b32", image: "scarf_img/scarf_set02_pair06_A.png" },
        { colorName: "유채색", color: "#d7c15a", image: "scarf_img/scarf_set02_pair06_B.png" }
      ]
    },
    {
      designId: "diamond",
      name: "다이아무늬",
      variants: [
        { colorName: "포도색", color: "#5b3d82", image: "scarf_img/scarf_set02_pair07_A.png" },
        { colorName: "살구색", color: "#e07a5f", image: "scarf_img/scarf_set02_pair07_B.png" }
      ]
    },
    {
      designId: "arc",
      name: "호무늬",
      variants: [
        { colorName: "청록색", color: "#1f6f8a", image: "scarf_img/scarf_set02_pair08_A.png" },
        { colorName: "홍시색", color: "#d64545", image: "scarf_img/scarf_set02_pair08_B.png" }
      ]
    },
    {
      designId: "ring",
      name: "고리무늬",
      variants: [
        { colorName: "밤색", color: "#6b3a2a", image: "scarf_img/scarf_01.png" }
      ]
    },
    {
      designId: "cross",
      name: "창살무늬",
      variants: [
        { colorName: "먹청", color: "#163c3c", image: "scarf_img/scarf_02.png" }
      ]
    },
    {
      designId: "scale",
      name: "비늘무늬",
      variants: [
        { colorName: "바다색", color: "#2a6f97", image: "scarf_img/scarf_03.png" }
      ]
    },
    {
      designId: "brick",
      name: "벽돌무늬",
      variants: [
        { colorName: "먹보라", color: "#4c2a62", image: "scarf_img/scarf_04.png" }
      ]
    },
    {
      designId: "hstripe",
      name: "가로줄무늬",
      variants: [
        { colorName: "먹갈색", color: "#5c4033", image: "scarf_img/scarf_05.png" }
      ]
    },
    {
      designId: "speck",
      name: "잔점무늬",
      variants: [
        { colorName: "청자색", color: "#355c7d", image: "scarf_img/scarf_06.png" }
      ]
    },
    {
      designId: "ripple",
      name: "잔물결무늬",
      variants: [
        { colorName: "감청", color: "#243e73", image: "scarf_img/scarf_07.png" }
      ]
    },
    {
      designId: "slash",
      name: "빗금무늬",
      variants: [
        { colorName: "고동색", color: "#6e4b2a", image: "scarf_img/scarf_08.png" }
      ]
    },
    { designId: "pic09", name: "스카프09", variants: [{ colorName: "그림", color: "#d7c4a3", image: "scarf_img/scarf_09.png" }] },
    { designId: "pic10", name: "스카프10", variants: [{ colorName: "그림", color: "#d7c4a3", image: "scarf_img/scarf_10.png" }] },
    {
      designId: "pic11",
      name: "큰방울무늬",
      variants: [
        { colorName: "푸른색", color: "#2f6ea8", image: "scarf_img/scarf_11.png" },
        { colorName: "보라색", color: "#7a3e86", image: "scarf_img/scarf_12.png" }
      ]
    },
    { designId: "pic13", name: "스카프13", variants: [{ colorName: "그림", color: "#d7c4a3", image: "scarf_img/scarf_13.png" }] },
    { designId: "pic14", name: "스카프14", variants: [{ colorName: "그림", color: "#d7c4a3", image: "scarf_img/scarf_14.png" }] },
    { designId: "pic15", name: "스카프15", variants: [{ colorName: "그림", color: "#d7c4a3", image: "scarf_img/scarf_15.png" }] },
    { designId: "pic16", name: "스카프16", variants: [{ colorName: "그림", color: "#d7c4a3", image: "scarf_img/scarf_16.png" }] },
    {
      designId: "ginkgo",
      name: "은행잎",
      variants: [
        { colorName: "청록", color: "#1f8a86", image: "scarf_img/scarves_16_bright_png/01_ginkgo_teal.png" },
        { colorName: "산호", color: "#e07a6a", image: "scarf_img/scarves_16_bright_png/02_ginkgo_ivory_coral.png" }
      ]
    },
    {
      designId: "deco",
      name: "당초",
      variants: [
        { colorName: "자두", color: "#7a3e6a", image: "scarf_img/scarves_16_bright_png/03_deco_plum.png" },
        { colorName: "남색", color: "#1e3a6e", image: "scarf_img/scarves_16_bright_png/04_deco_navy.png" }
      ]
    },
    {
      designId: "contour",
      name: "등고선",
      variants: [
        { colorName: "올리브", color: "#6b7a32", image: "scarf_img/scarves_16_bright_png/05_contour_olive.png" },
        { colorName: "푸른색", color: "#3a6ea5", image: "scarf_img/scarves_16_bright_png/06_contour_blue.png" }
      ]
    },
    {
      designId: "camellia",
      name: "동백",
      variants: [
        { colorName: "버건디", color: "#8c2f45", image: "scarf_img/scarves_16_bright_png/07_camellia_burgundy.png" },
        { colorName: "숲색", color: "#2f6b45", image: "scarf_img/scarves_16_bright_png/08_camellia_forest.png" }
      ]
    },
    {
      designId: "mosaic",
      name: "조각",
      variants: [
        { colorName: "코발트", color: "#2a4fa0", image: "scarf_img/scarves_16_bright_png/09_mosaic_cobalt.png" },
        { colorName: "녹슨색", color: "#b85a32", image: "scarf_img/scarves_16_bright_png/10_mosaic_rust.png" }
      ]
    },
    {
      designId: "ocean",
      name: "바다",
      variants: [
        { colorName: "남색", color: "#1a3a6e", image: "scarf_img/scarves_16_bright_png/11_ocean_navy.png" },
        { colorName: "연보라", color: "#b7a0d4", image: "scarf_img/scarves_16_bright_png/12_ocean_lilac.png" }
      ]
    },
    {
      designId: "checker",
      name: "체크",
      variants: [
        { colorName: "검정", color: "#2c2c2c", image: "scarf_img/scarves_16_bright_png/13_checker_black_ivory.png" },
        { colorName: "밤청", color: "#3d5a8a", image: "scarf_img/scarves_16_bright_png/14_checker_chocolate_blue.png" }
      ]
    },
    {
      designId: "night",
      name: "밤정원",
      variants: [
        { colorName: "가지색", color: "#5c2a4a", image: "scarf_img/scarves_16_bright_png/15_night_garden_aubergine.png" },
        { colorName: "안개색", color: "#c5c8cc", image: "scarf_img/scarves_16_bright_png/16_night_garden_mist.png" }
      ]
    }
  ]
};
